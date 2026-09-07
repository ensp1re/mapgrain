import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { HARNESS_PATHS } from "../constants/paths.ts";
import { TASK_STATE } from "../constants/states.ts";
import { HarnessError } from "../lib/error.ts";
import { fingerprint } from "../lib/fingerprint.ts";
import { atomicWrite } from "../lib/fs.ts";
import { gitInfo, runGit } from "../lib/git.ts";
import { acquireLock } from "../lib/lock.ts";
import { loadState, validateState } from "../lib/validate.ts";
import type { CommandResult, DeliveryEvidence } from "../types/records.ts";

const execFile = promisify(execFileCallback);

function ghBin(): string {
  return process.env.HARNESS_GH_BIN ?? "gh";
}

async function runGh(
  root: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFile(ghBin(), args, {
      cwd: root,
      encoding: "utf8",
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: (err.stdout ?? "").trim(),
      stderr: (err.stderr ?? "").trim(),
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}

export async function commandDeliver(root: string, args: string[]): Promise<CommandResult> {
  const id = args.find((item) => !item.startsWith("--"));
  if (!id) throw new HarnessError("usage: deliver ID [--dry-run]");
  const dryRun = args.includes("--dry-run");

  const release = await acquireLock(root);
  try {
    const state = await loadState(root);
    const validation = await validateState(root, state);
    const task = state.tasks.tasks.find((item) => item.id === id);
    if (!task) throw new HarnessError(`unknown live task: ${id}`);
    if (task.state !== TASK_STATE.VERIFIED) {
      throw new HarnessError(`${id} must be verified before deliver`, 1);
    }

    const git = await gitInfo(root);
    const current = await fingerprint(root, state.config, state.tasks);
    const expected = task.evidence?.fingerprintAfter ?? task.evidence?.fingerprintBefore;
    const fresh = Boolean(expected && current.digest === expected);
    const defaultBranch = state.config.delivery.defaultBranch;
    const onDefault = git.branch === defaultBranch;
    const proposed: string[] = [];
    if (!git.available) proposed.push("initialize git");
    if (git.dirty) proposed.push("commit or restore local changes");
    if (onDefault) proposed.push(`move work to a feature branch off ${defaultBranch}`);
    if (!fresh) proposed.push("reactivate and re-verify after input changes");
    if (validation.errors.length) proposed.push("fix harness validation errors");

    let remote: string | null = null;
    let prUrl: string | null = null;
    try {
      remote = (await runGit(root, ["remote", "get-url", "origin"])).stdout || null;
    } catch {
      proposed.push("add a GitHub origin remote");
    }

    const auth = await runGh(root, ["auth", "status"]);
    if (auth.exitCode !== 0) proposed.push("authenticate gh for GitHub");

    const prView = await runGh(root, [
      "pr",
      "view",
      "--json",
      "url,state,isDraft,headRefOid,statusCheckRollup",
    ]);
    if (prView.exitCode === 0 && prView.stdout) {
      try {
        const parsed = JSON.parse(prView.stdout) as { url?: string };
        prUrl = parsed.url ?? null;
      } catch {
        prUrl = null;
      }
    } else {
      proposed.push("open a draft pull request");
    }

    if (dryRun) {
      return {
        payload: {
          ok: fresh && !onDefault && git.available && !git.dirty && validation.errors.length === 0,
          dryRun: true,
          id,
          git,
          fresh,
          remote,
          prUrl,
          errors: validation.errors,
          proposedActions: proposed,
        },
        exitCode: 0,
      };
    }

    if (!fresh) throw new HarnessError(`${id} evidence is stale`, 1);
    if (!git.available || !git.revision) throw new HarnessError("git is unavailable", 1);
    if (git.dirty) throw new HarnessError("working tree is dirty; commit the implementation first", 1);
    if (!git.branch || onDefault) {
      throw new HarnessError(`deliver refuses to push ${defaultBranch}; use a feature branch`, 1);
    }
    if (auth.exitCode !== 0) throw new HarnessError("gh is not authenticated", 1);
    if (!remote) throw new HarnessError("origin remote is missing", 1);

    try {
      await runGit(root, ["push", "-u", "origin", "HEAD"]);
    } catch (error) {
      throw new HarnessError(
        `git push failed: ${error instanceof Error ? error.message : String(error)}`,
        1,
      );
    }

    if (!prUrl) {
      const created = await runGh(root, [
        "pr",
        "create",
        "--draft",
        "--base",
        defaultBranch,
        "--title",
        task.behavior,
        "--body",
        `Task ${id}\n\n## Verification\n\nLocal harness verify passed on ${git.revision}.`,
      ]);
      if (created.exitCode !== 0) {
        throw new HarnessError(`failed to create draft PR: ${created.stderr || created.stdout}`, 1);
      }
      prUrl = created.stdout.split("\n").find((line) => line.startsWith("http")) ?? created.stdout;
    }

    const checks = await runGh(root, ["pr", "checks", "--json", "name,state,bucket,link"]);
    let checkRuns: DeliveryEvidence["checkRuns"] = [];
    let ciPassed = false;
    if (checks.exitCode === 0 && checks.stdout) {
      try {
        const parsed = JSON.parse(checks.stdout) as Array<{
          name?: string;
          state?: string;
          bucket?: string;
          link?: string;
        }>;
        checkRuns = parsed.map((item) => ({
          name: item.name ?? "unknown",
          revision: git.revision,
          conclusion: item.bucket ?? item.state ?? null,
          url: item.link ?? null,
        }));
        ciPassed =
          parsed.length > 0 && parsed.every((item) => (item.bucket ?? item.state) === "pass");
      } catch {
        checkRuns = [];
      }
    }

    const delivery: DeliveryEvidence = {
      implementationRevision: git.revision,
      remote,
      prUrl,
      checkRuns,
      observedAt: new Date().toISOString(),
    };
    task.delivery = delivery;

    if (!ciPassed) {
      await atomicWrite(root, HARNESS_PATHS.tasks, state.tasks);
      return {
        payload: {
          ok: false,
          id,
          delivery,
          error: "required CI has not passed on the implementation revision",
        },
        exitCode: 1,
      };
    }

    task.state = TASK_STATE.PASSING;
    await atomicWrite(root, HARNESS_PATHS.tasks, state.tasks);
    return {
      payload: { ok: true, id, state: task.state, delivery },
      exitCode: 0,
    };
  } finally {
    await release();
  }
}
