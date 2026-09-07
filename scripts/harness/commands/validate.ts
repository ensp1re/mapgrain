import { HarnessError } from "../lib/error.ts";
import { loadState, validateState } from "../lib/validate.ts";
import type { CommandResult } from "../types/records.ts";

export async function commandValidate(root: string): Promise<CommandResult> {
  try {
    const state = await loadState(root);
    const validation = await validateState(root, state);
    return {
      payload: {
        ok: validation.errors.length === 0,
        errors: validation.errors,
      },
      exitCode: validation.errors.length ? 1 : 0,
    };
  } catch (error) {
    if (error instanceof HarnessError) {
      const details = Array.isArray(error.details) ? error.details : [];
      return {
        payload: {
          ok: false,
          errors: details.length ? details.map(String) : [error.message],
        },
        exitCode: error.exitCode,
      };
    }
    throw error;
  }
}
