import { SCHEMA_VERSION, TASK_STATE } from "../constants/states.ts";
import { fingerprint } from "../lib/fingerprint.ts";
import { gitInfo } from "../lib/git.ts";
import { loadState, readyTaskIds, validateState } from "../lib/validate.ts";
import type { CommandResult } from "../types/records.ts";

export async function commandContext(root: string): Promise<CommandResult> {
  const state = await loadState(root);
  const validation = await validateState(root, state);
  const freshness: Record<string, unknown> = {};
  for (const task of state.tasks.tasks) {
    if (task.evidence?.status !== "passed") continue;
    try {
      const current = await fingerprint(root, state.config, state.tasks);
      const expected = task.evidence.fingerprintAfter ?? task.evidence.fingerprintBefore;
      freshness[task.id] = {
        fresh: current.digest === expected,
        digest: current.digest,
        expected,
      };
    } catch (error) {
      freshness[task.id] = {
        fresh: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
  const active = state.tasks.tasks.find((task) => task.state === TASK_STATE.ACTIVE) ?? null;
  return {
    payload: {
      ok: validation.errors.length === 0,
      schemaVersion: SCHEMA_VERSION,
      git: await gitInfo(root),
      activeTask: active?.id ?? null,
      readyTaskIds: readyTaskIds(state.tasks.tasks, validation.archived),
      blockers: state.tasks.tasks
        .filter((task) => task.state === TASK_STATE.BLOCKED)
        .map((task) => ({ id: task.id, reason: task.blockedReason })),
      evidenceFreshness: freshness,
      nextAction: state.handoff?.nextAction ?? null,
      errors: validation.errors,
    },
    exitCode: validation.errors.length ? 1 : 0,
  };
}
