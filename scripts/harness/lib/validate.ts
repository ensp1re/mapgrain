import { promises as fs } from "node:fs";
import path from "node:path";
import { HARNESS_PATHS } from "../constants/paths.ts";
import { SCHEMA_VERSION, TASK_STATE } from "../constants/states.ts";
import type {
  HarnessConfig,
  HandoffRecord,
  LoadedState,
  TaskRecord,
  TaskStateFile,
} from "../types/records.ts";
import { HarnessError } from "./error.ts";
import { fingerprint } from "./fingerprint.ts";
import { exists, readJsonFile, safePath } from "./fs.ts";

const TASK_ID = /^F\d{3,}$/;
const STATES = new Set<string>(Object.values(TASK_STATE));

export function asRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateConfig(config: unknown): { value?: HarnessConfig; errors: string[] } {
  const errors: string[] = [];
  if (!asRecord(config)) return { errors: ["config must be an object"] };
  if (config.schemaVersion !== SCHEMA_VERSION) errors.push("config schemaVersion must be 1");
  if (!Array.isArray(config.checks)) errors.push("config checks must be an array");
  const ids = new Set<string>();
  const checks: HarnessConfig["checks"] = [];
  for (const check of Array.isArray(config.checks) ? config.checks : []) {
    if (!asRecord(check)) {
      errors.push("check must be an object");
      continue;
    }
    if (typeof check.id !== "string" || !check.id) errors.push("check id must be non-empty");
    if (typeof check.id === "string") {
      if (ids.has(check.id)) errors.push(`duplicate check id: ${check.id}`);
      ids.add(check.id);
    }
    if (
      !Array.isArray(check.argv) ||
      check.argv.length === 0 ||
      check.argv.some((part) => typeof part !== "string" || !part)
    ) {
      errors.push(`check ${String(check.id)} argv must be a non-empty argv array`);
    }
    if (typeof check.cwd !== "string" || path.isAbsolute(check.cwd) || check.cwd.includes("..")) {
      errors.push(`check ${String(check.id)} cwd must be relative`);
    }
    if (typeof check.timeoutSeconds !== "number" || check.timeoutSeconds <= 0) {
      errors.push(`check ${String(check.id)} timeoutSeconds must be positive`);
    }
    if (typeof check.required !== "boolean") {
      errors.push(`check ${String(check.id)} required must be boolean`);
    }
    if (typeof check.id === "string" && Array.isArray(check.argv)) {
      checks.push({
        id: check.id,
        argv: check.argv as string[],
        cwd: typeof check.cwd === "string" ? check.cwd : ".",
        timeoutSeconds: typeof check.timeoutSeconds === "number" ? check.timeoutSeconds : 120,
        required: Boolean(check.required),
      });
    }
  }
  if (!Array.isArray(config.fingerprintPaths) || config.fingerprintPaths.length === 0) {
    errors.push("config fingerprintPaths must be non-empty");
  }
  if (!asRecord(config.delivery)) errors.push("config delivery must be an object");
  if (errors.length) return { errors };
  return {
    value: {
      schemaVersion: SCHEMA_VERSION,
      checks,
      fingerprintPaths: config.fingerprintPaths as string[],
      delivery: config.delivery as HarnessConfig["delivery"],
    },
    errors,
  };
}

function numericId(id: string): number {
  return Number(id.slice(1)) || 0;
}

export function detectCycles(tasks: TaskRecord[], archived: TaskRecord[]): string[] {
  const all = new Map([...tasks, ...archived].map((task) => [task.id, task]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: string[] = [];

  function visit(id: string, stack: string[] = []) {
    if (visiting.has(id)) {
      const index = stack.indexOf(id);
      cycles.push([...stack.slice(index), id].join(" -> "));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const task = all.get(id);
    for (const dependency of task?.dependsOn ?? []) visit(dependency, [...stack, id]);
    visiting.delete(id);
    visited.add(id);
  }

  for (const task of tasks) visit(task.id);
  return cycles;
}

export async function archivedTasks(root: string): Promise<TaskRecord[]> {
  const directory = await safePath(root, HARNESS_PATHS.archive, { allowMissing: true });
  if (!(await exists(directory))) return [];
  const names = (await fs.readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  const result: TaskRecord[] = [];
  for (const name of names) {
    const stored = `${HARNESS_PATHS.archive}/${name}`;
    const value = await readJsonFile(root, stored);
    if (asRecord(value) && asRecord(value.task) && typeof value.task.id === "string") {
      result.push(value.task as unknown as TaskRecord);
    }
  }
  return result;
}

export function checkMap(config: HarnessConfig): Map<string, HarnessConfig["checks"][number]> {
  return new Map(config.checks.map((check) => [check.id, check]));
}

export function passingIds(live: TaskRecord[], archived: TaskRecord[]): Set<string> {
  return new Set(
    [...live, ...archived]
      .filter((task) => task.state === TASK_STATE.PASSING)
      .map((task) => task.id),
  );
}

export function readyTaskIds(live: TaskRecord[], archived: TaskRecord[]): string[] {
  const passing = passingIds(live, archived);
  return live
    .filter(
      (task) =>
        task.state === TASK_STATE.NOT_STARTED &&
        task.dependsOn.every((id) => passing.has(id)),
    )
    .sort((a, b) => numericId(a.id) - numericId(b.id))
    .map((task) => task.id);
}

export function parseHandoff(value: unknown): HandoffRecord | null {
  if (!asRecord(value)) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    taskId: typeof value.taskId === "string" ? value.taskId : null,
    plan: typeof value.plan === "string" ? value.plan : null,
    git: (value.git as HandoffRecord["git"]) ?? null,
    evidenceRefs: Array.isArray(value.evidenceRefs)
      ? value.evidenceRefs.filter((item): item is string => typeof item === "string")
      : [],
    decisions: Array.isArray(value.decisions)
      ? value.decisions.filter((item): item is string => typeof item === "string")
      : [],
    rejectedApproaches: Array.isArray(value.rejectedApproaches)
      ? value.rejectedApproaches.filter((item): item is string => typeof item === "string")
      : [],
    blockers: Array.isArray(value.blockers)
      ? value.blockers.filter((item): item is string => typeof item === "string")
      : [],
    nextAction: typeof value.nextAction === "string" ? value.nextAction : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

export async function loadState(root: string): Promise<LoadedState> {
  const configRaw = await readJsonFile(root, HARNESS_PATHS.config);
  const tasksRaw = await readJsonFile(root, HARNESS_PATHS.tasks);
  const handoffRaw = await readJsonFile(root, HARNESS_PATHS.handoff, { allowMissing: true });
  const config = validateConfig(configRaw);
  if (!config.value) {
    throw new HarnessError("invalid harness config", 1, config.errors);
  }
  if (!asRecord(tasksRaw) || !Array.isArray(tasksRaw.tasks)) {
    throw new HarnessError("tasks must be an object with a tasks array", 1);
  }
  return {
    config: config.value,
    tasks: tasksRaw as unknown as TaskStateFile,
    handoff: parseHandoff(handoffRaw),
  };
}

export async function validateState(
  root: string,
  state: LoadedState,
  options: { includeFreshness?: boolean } = {},
): Promise<{ errors: string[]; archived: TaskRecord[] }> {
  const includeFreshness = options.includeFreshness ?? true;
  const errors = [...validateConfig(state.config).errors];
  const archived = await archivedTasks(root).catch(() => [] as TaskRecord[]);
  const { tasks } = state;
  const allIds = new Set<string>();
  let maxNumericId = 0;
  let activeCount = 0;

  if (tasks.schemaVersion !== SCHEMA_VERSION) errors.push("tasks schemaVersion must be 1");
  if (!Array.isArray(tasks.tasks)) errors.push("tasks tasks must be an array");

  for (const task of tasks.tasks ?? []) {
    if (!asRecord(task)) {
      errors.push("task must be an object");
      continue;
    }
    if (!TASK_ID.test(task.id ?? "")) errors.push(`invalid task id: ${task.id}`);
    if (allIds.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
    allIds.add(task.id);
    maxNumericId = Math.max(maxNumericId, numericId(task.id));
    if (typeof task.behavior !== "string" || !task.behavior.trim()) {
      errors.push(`${task.id} behavior is required`);
    }
    if (
      !Array.isArray(task.acceptance) ||
      task.acceptance.length === 0 ||
      task.acceptance.some((item) => typeof item !== "string" || !item.trim())
    ) {
      errors.push(`${task.id} acceptance must be non-empty`);
    }
    if (!Array.isArray(task.dependsOn)) errors.push(`${task.id} dependsOn must be an array`);
    if (!STATES.has(task.state)) errors.push(`${task.id} has invalid state ${task.state}`);
    if (task.state === TASK_STATE.ACTIVE) activeCount += 1;
    if (
      task.state === TASK_STATE.BLOCKED &&
      (!task.blockedReason || typeof task.blockedReason !== "string")
    ) {
      errors.push(`${task.id} blocked state requires blockedReason`);
    }
    if (task.spec !== null && (typeof task.spec !== "string" || path.isAbsolute(task.spec))) {
      errors.push(`${task.id} spec must be relative or null`);
    }
    if (task.plan !== null && (typeof task.plan !== "string" || path.isAbsolute(task.plan))) {
      errors.push(`${task.id} plan must be relative or null`);
    }
    if (!Array.isArray(task.verification)) errors.push(`${task.id} verification must be an array`);
    for (const checkId of task.verification ?? []) {
      if (!checkMap(state.config).has(checkId)) {
        errors.push(`${task.id} references unknown check ${checkId}`);
      }
    }
    if (task.evidence !== null && task.evidence !== undefined && !asRecord(task.evidence)) {
      errors.push(`${task.id} evidence must be an object or null`);
    }
    if (task.state === TASK_STATE.VERIFIED || task.state === TASK_STATE.PASSING) {
      if (task.evidence?.status !== "passed") {
        errors.push(`${task.id} ${task.state} requires passed evidence`);
      }
      if (!task.evidence?.attemptId) {
        errors.push(`${task.id} ${task.state} requires an attemptId`);
      }
      if (includeFreshness && task.evidence?.status === "passed") {
        try {
          const current = await fingerprint(root, state.config, state.tasks);
          const expected = task.evidence.fingerprintAfter ?? task.evidence.fingerprintBefore;
          if (current.digest !== expected) errors.push(`${task.id} evidence is stale`);
        } catch (error) {
          errors.push(
            `${task.id} freshness unavailable: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  for (const task of archived) {
    if (allIds.has(task.id)) errors.push(`duplicate live/archive task id: ${task.id}`);
    allIds.add(task.id);
    maxNumericId = Math.max(maxNumericId, numericId(task.id));
  }

  if (!Number.isInteger(tasks.nextId) || tasks.nextId <= maxNumericId) {
    errors.push("tasks nextId must exceed every allocated numeric id");
  }
  if (activeCount > 1) errors.push("at most one task may be active");

  const liveIds = new Set((tasks.tasks ?? []).map((task) => task.id));
  const archivedIds = new Set(archived.map((task) => task.id));
  for (const task of tasks.tasks ?? []) {
    for (const dependency of task.dependsOn ?? []) {
      if (!liveIds.has(dependency) && !archivedIds.has(dependency)) {
        errors.push(`${task.id} depends on missing task ${dependency}`);
      }
    }
  }
  errors.push(
    ...detectCycles(tasks.tasks ?? [], archived).map((cycle) => `dependency cycle: ${cycle}`),
  );

  for (const task of tasks.tasks ?? []) {
    for (const stored of [task.spec, task.plan]) {
      if (stored && !(await exists(await safePath(root, stored, { allowMissing: true })))) {
        errors.push(`${task.id} references missing artifact ${stored}`);
      }
    }
  }

  if (state.handoff?.taskId && !allIds.has(state.handoff.taskId)) {
    errors.push(`handoff references missing task ${state.handoff.taskId}`);
  }
  if (state.handoff?.plan && !(await exists(await safePath(root, state.handoff.plan, { allowMissing: true })))) {
    errors.push(`handoff references missing plan ${state.handoff.plan}`);
  }

  return { errors, archived };
}
