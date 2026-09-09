# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: feat/v4-git-evidence @ 1a217a5bd27e51674d3985502facf70bda3e8e77 (dirty)
- Updated: 2026-09-09T16:52:51.366Z

### Next action

F045 is locally verified. Push a draft PR against main.

### Decisions

- Published npm CLI is npx mapgrain@0.1.0 (architecture/workflow). Source CLI is 0.2.0 and is not on npm yet.
- JPEG/WebP/clipboard are editor raster paths. CLI does not encode JPEG/WebP.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- A working-tree snapshot hash is not Git verification. verified requires a 40-character commit SHA whose blob matches snapshot.
- Do not claim sequence fragments, live agent prompt runs, Mermaid/draw.io import, hosted sharing, or a five-user study.

### Rejected approaches

- Copying another product's source, assets, or copy.
- Claiming a deferred feature is shipped.
- Inventing AI output or user-study evidence.

### Blockers

- none

### Evidence

- docs/runs/run-1788972740440-921c2c.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
