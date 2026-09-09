# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: F043
- Plan: docs/PLAN.md
- Git: feat/v4-usable-diagrams @ d8ae52522ed6bd8fc79a9fa4f1b50772414c2d89 (dirty)
- Updated: 2026-09-09T16:13:46.952Z

### Next action

F043 is locally verified (run-1788970617934-1b98cd). Push a draft PR against main, wait for CI, then merge.

### Decisions

- Published npm CLI is npx mapgrain@0.1.0 (architecture/workflow). Source CLI is 0.2.0 and is not on npm yet.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- Do not claim sequence fragments, live agent prompt runs, Mermaid/draw.io import, hosted sharing, or a five-user study.

### Rejected approaches

- Copying another product's source, assets, or copy.
- Claiming a deferred feature is shipped.
- Inventing AI output or user-study evidence.

### Blockers

- none

### Evidence

- docs/runs/run-1788970617934-1b98cd.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
