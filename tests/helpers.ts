import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { SCHEMA_VERSION } from "../scripts/constants/states.ts";
import type { HarnessConfig, TaskRecord, TaskStateFile } from "../scripts/types/records.ts";

const execFile = promisify(execFileCallback);
const CLI = fileURLToPath(new URL("../scripts/cli.ts", import.meta.url));

function isolatedGitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_COMMON_DIR;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_OBJECT_DIRECTORY;
  delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES;
  return env;
}

export const PASSING_ARGV = [process.execPath, "-e", "process.exit(0)"];
export const FAILING_ARGV = [process.execPath, "-e", "process.exit(9)"];
export const MISSING_ARGV = ["missing-harness-executable-9d137"];

export interface FixtureOptions {
  tasks?: TaskRecord[];
  nextId?: number;
  checks?: HarnessConfig["checks"];
  fingerprintPaths?: string[];
  withGit?: boolean;
}

export async function makeFixture(options: FixtureOptions = {}): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "mapgrain-harness-"));
  await mkdir(path.join(root, "docs/runs"), { recursive: true });
  await mkdir(path.join(root, "docs/archive"), { recursive: true });
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "package.json"), `${JSON.stringify({ name: "fixture" }, null, 2)}\n`);
  await writeFile(path.join(root, "src/index.ts"), "export const ok = true;\n");
  await writeFile(path.join(root, "docs/PLAN.md"), "# plan\n");
  await writeFile(path.join(root, "docs/PROJECT.md"), "# project\n");

  const config: HarnessConfig = {
    schemaVersion: SCHEMA_VERSION,
    checks: options.checks ?? [
      {
        id: "unit",
        argv: PASSING_ARGV,
        cwd: ".",
        timeoutSeconds: 10,
        required: true,
      },
    ],
    fingerprintPaths: options.fingerprintPaths ?? ["package.json", "src"],
    delivery: { provider: "github", defaultBranch: "main", requirePR: true },
  };
  await writeFile(path.join(root, "docs/config.json"), `${JSON.stringify(config, null, 2)}\n`);

  const tasks: TaskStateFile = {
    schemaVersion: SCHEMA_VERSION,
    nextId: options.nextId ?? 2,
    tasks: options.tasks ?? [sampleTask()],
  };
  await writeFile(path.join(root, "docs/tasks.json"), `${JSON.stringify(tasks, null, 2)}\n`);
  await writeFile(
    path.join(root, "docs/handoff.json"),
    `${JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        taskId: null,
        plan: "docs/PLAN.md",
        git: null,
        evidenceRefs: [],
        decisions: ["keep this decision"],
        rejectedApproaches: ["abandoned approach"],
        blockers: [],
        nextAction: "activate F001",
        updatedAt: "2026-09-07T00:00:00.000Z",
      },
      null,
      2,
    )}\n`,
  );

  if (options.withGit) {
    const env = isolatedGitEnv();
    await execFile("git", ["init", "-b", "main"], { cwd: root, env });
    await execFile("git", ["add", "."], { cwd: root, env });
    await execFile(
      "git",
      [
        "-c",
        "user.name=fixture",
        "-c",
        "user.email=fixture@example.test",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "chore: fixture",
      ],
      { cwd: root, env },
    );
  }
  return root;
}

export function sampleTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "F001",
    behavior: "Plumbing task used only by harness tests.",
    acceptance: ["The configured unit check passes."],
    dependsOn: [],
    state: "not_started",
    spec: "docs/PROJECT.md",
    plan: "docs/PLAN.md",
    verification: ["unit"],
    blockedReason: null,
    evidence: null,
    delivery: null,
    ...overrides,
  };
}

export async function repoGitConfig(key: string): Promise<string | null> {
  try {
    const { stdout } = await execFile("git", ["config", "--get", key], { encoding: "utf8" });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function runHarness(
  root: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
): Promise<{ exitCode: number; payload: Record<string, unknown>; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFile(process.execPath, [CLI, "--root", root, ...args], {
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
    return {
      exitCode: 0,
      payload: JSON.parse(stdout) as Record<string, unknown>,
      stdout,
      stderr,
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number };
    const stdout = err.stdout ?? "";
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(stdout) as Record<string, unknown>;
    } catch {
      payload = { raw: stdout };
    }
    return {
      exitCode: typeof err.code === "number" ? err.code : 1,
      payload,
      stdout,
      stderr: err.stderr ?? "",
    };
  }
}
