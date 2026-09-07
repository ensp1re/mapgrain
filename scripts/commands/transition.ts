import { HARNESS_PATHS } from "../constants/paths.ts";
import { TASK_STATE } from "../constants/states.ts";
import { HarnessError } from "../lib/error.ts";
import { atomicWrite } from "../lib/fs.ts";
import { acquireLock } from "../lib/lock.ts";
import { loadState, passingIds, validateState } from "../lib/validate.ts";
import type { CommandResult } from "../types/records.ts";

function parseReason(args: string[]): string | null {
  const index = args.indexOf("--reason");
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

export async function commandTransition(root: string, args: string[]): Promise<CommandResult> {
  const id = args[0];
  const target = args[1];
  if (!id || !target) throw new HarnessError("usage: transition ID STATE");

  const release = await acquireLock(root);
  try {
    const state = await loadState(root);
    const validation = await validateState(root, state, { includeFreshness: false });
    if (validation.errors.length) {
      throw new HarnessError("state is invalid; transition refused", 1, validation.errors);
    }
    const task = state.tasks.tasks.find((item) => item.id === id);
    if (!task) throw new HarnessError(`unknown live task: ${id}`);

    if (target === TASK_STATE.ACTIVE) {
      if (
        task.state !== TASK_STATE.NOT_STARTED &&
        task.state !== TASK_STATE.BLOCKED &&
        task.state !== TASK_STATE.VERIFIED
      ) {
        throw new HarnessError(`${id} cannot transition ${task.state} -> active`, 1);
      }
      const otherActive = state.tasks.tasks.some(
        (item) => item.state === TASK_STATE.ACTIVE && item.id !== id,
      );
      if (otherActive) throw new HarnessError("WIP limit reached: another task is active", 1);
      const passing = passingIds(state.tasks.tasks, validation.archived);
      if (!task.dependsOn.every((dependency) => passing.has(dependency))) {
        throw new HarnessError(`${id} has unsatisfied dependencies`, 1);
      }
      task.state = TASK_STATE.ACTIVE;
      task.blockedReason = null;
    } else if (target === TASK_STATE.BLOCKED) {
      if (task.state !== TASK_STATE.ACTIVE) {
        throw new HarnessError(`${id} can only become blocked from active`, 1);
      }
      const reason = parseReason(args);
      if (!reason) throw new HarnessError("blocked transition requires --reason TEXT");
      task.state = TASK_STATE.BLOCKED;
      task.blockedReason = reason;
    } else if (target === TASK_STATE.VERIFIED) {
      throw new HarnessError("verified is produced only by verify ID", 1);
    } else if (target === TASK_STATE.PASSING) {
      throw new HarnessError("passing is produced only by deliver ID", 1);
    } else if (target === TASK_STATE.NOT_STARTED) {
      throw new HarnessError(`${id} cannot transition ${task.state} -> not_started`, 1);
    } else {
      throw new HarnessError(`unsupported transition target: ${target}`);
    }

    await atomicWrite(root, HARNESS_PATHS.tasks, state.tasks);
    return {
      payload: { ok: true, command: "transition", id, state: task.state },
      exitCode: 0,
    };
  } finally {
    await release();
  }
}
