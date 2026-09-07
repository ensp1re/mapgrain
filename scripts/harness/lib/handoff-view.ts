import type { HandoffRecord } from "../types/records.ts";

export function renderHandoffMarkdown(handoff: HandoffRecord): string {
  const git = handoff.git?.available
    ? `${handoff.git.branch ?? "(detached)"} @ ${handoff.git.revision ?? "unknown"}${handoff.git.dirty ? " (dirty)" : ""}`
    : "git unavailable";
  const decisions = handoff.decisions.length
    ? handoff.decisions.map((item) => `- ${item}`).join("\n")
    : "- none";
  const rejected = handoff.rejectedApproaches.length
    ? handoff.rejectedApproaches.map((item) => `- ${item}`).join("\n")
    : "- none";
  const blockers = handoff.blockers.length
    ? handoff.blockers.map((item) => `- ${item}`).join("\n")
    : "- none";
  const evidence = handoff.evidenceRefs.length
    ? handoff.evidenceRefs.map((item) => `- ${item}`).join("\n")
    : "- none";

  return `# Session handoff

This is a readable view of \`docs/harness/handoff.json\`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: ${handoff.taskId ?? "none"}
- Plan: ${handoff.plan ?? "none"}
- Git: ${git}
- Updated: ${handoff.updatedAt}

### Next action

${handoff.nextAction || "(not set)"}

### Decisions

${decisions}

### Rejected approaches

${rejected}

### Blockers

${blockers}

### Evidence

${evidence}

## Resume

Run \`node --experimental-strip-types scripts/harness/cli.ts --root . context\`, inspect discrepancies, and follow the recorded next action.
`;
}
