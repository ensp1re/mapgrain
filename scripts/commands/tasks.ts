import { loadState, readyTaskIds, validateState } from "../lib/validate.ts";
import type { CommandResult } from "../types/records.ts";

export async function commandTasks(root: string): Promise<CommandResult> {
  const state = await loadState(root);
  const validation = await validateState(root, state, { includeFreshness: false });
  return {
    payload: {
      ok: validation.errors.length === 0,
      tasks: state.tasks.tasks,
      readyTaskIds: readyTaskIds(state.tasks.tasks, validation.archived),
      errors: validation.errors,
    },
    exitCode: validation.errors.length ? 1 : 0,
  };
}
