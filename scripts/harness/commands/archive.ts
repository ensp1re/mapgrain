import { HARNESS_PATHS } from "../constants/paths.ts";
import { SCHEMA_VERSION, TASK_STATE } from "../constants/states.ts";
import { HarnessError } from "../lib/error.ts";
import { atomicWrite, exists, safePath } from "../lib/fs.ts";
import { acquireLock } from "../lib/lock.ts";
import { loadState, validateState } from "../lib/validate.ts";
import type { ArchiveRecord, CommandResult } from "../types/records.ts";

export async function commandArchive(root: string, args: string[]): Promise<CommandResult> {
  const id = args.find((item) => !item.startsWith("--"));
  if (!id) throw new HarnessError("usage: archive ID [--dry-run]");
  const dryRun = args.includes("--dry-run");

  const release = await acquireLock(root);
  try {
    const state = await loadState(root);
    const validation = await validateState(root, state);
    if (validation.errors.length) {
      throw new HarnessError("state is invalid; archive refused", 1, validation.errors);
    }
    const index = state.tasks.tasks.findIndex((task) => task.id === id);
    if (index === -1) throw new HarnessError(`unknown live task: ${id}`);
    const task = state.tasks.tasks[index];
    if (!task) throw new HarnessError(`unknown live task: ${id}`);
    if (task.state !== TASK_STATE.PASSING) {
      throw new HarnessError(`${id} must be passing before archive`, 1);
    }
    const archived: ArchiveRecord = {
      schemaVersion: SCHEMA_VERSION,
      task,
      archivedAt: new Date().toISOString(),
    };
    if (dryRun) {
      return { payload: { ok: true, dryRun: true, id, archive: archived }, exitCode: 0 };
    }
    const stored = `${HARNESS_PATHS.archive}/${id}.json`;
    const destination = await safePath(root, stored, { allowMissing: true });
    if (await exists(destination)) {
      throw new HarnessError(`archive already exists for ${id}`, 1);
    }
    await atomicWrite(root, stored, archived);
    state.tasks.tasks.splice(index, 1);
    await atomicWrite(root, HARNESS_PATHS.tasks, state.tasks);
    return { payload: { ok: true, id, archived: true }, exitCode: 0 };
  } finally {
    await release();
  }
}
