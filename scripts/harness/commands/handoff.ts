import { HARNESS_PATHS } from "../constants/paths.ts";
import { SCHEMA_VERSION, TASK_STATE } from "../constants/states.ts";
import { atomicWrite } from "../lib/fs.ts";
import { gitInfo } from "../lib/git.ts";
import { renderHandoffMarkdown } from "../lib/handoff-view.ts";
import { acquireLock } from "../lib/lock.ts";
import { loadState } from "../lib/validate.ts";
import type { CommandResult, HandoffRecord } from "../types/records.ts";

export async function commandHandoff(root: string): Promise<CommandResult> {
  const release = await acquireLock(root);
  try {
    const state = await loadState(root);
    const previous = state.handoff;
    const active = state.tasks.tasks.find((task) => task.state === TASK_STATE.ACTIVE) ?? null;
    const evidenceRefs = [
      ...new Set(
        state.tasks.tasks
          .map((task) => task.evidence?.attemptId)
          .filter((item): item is string => Boolean(item))
          .map((attemptId) => `${HARNESS_PATHS.runs}/${attemptId}.json`),
      ),
    ];
    const next: HandoffRecord = {
      schemaVersion: SCHEMA_VERSION,
      taskId: active?.id ?? null,
      plan: previous?.plan ?? "docs/harness/PLAN.md",
      git: await gitInfo(root),
      evidenceRefs,
      decisions: previous?.decisions ?? [],
      rejectedApproaches: previous?.rejectedApproaches ?? [],
      blockers: previous?.blockers ?? [],
      nextAction: previous?.nextAction ?? "",
      updatedAt: new Date().toISOString(),
    };
    await atomicWrite(root, HARNESS_PATHS.handoff, next);
    await atomicWrite(root, HARNESS_PATHS.handoffView, renderHandoffMarkdown(next));
    return { payload: { ok: true, handoff: next }, exitCode: 0 };
  } finally {
    await release();
  }
}
