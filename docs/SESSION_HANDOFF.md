# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: feat/v4-sequence-fragments @ f8916fa5c9e662dce250987f34a0132bf2b33d52 (dirty)
- Updated: 2026-09-09T17:59:28.263Z

### Next action

F047 is locally verified. Push a draft PR against main.

### Decisions

- Published npm CLI is npx mapgrain@0.1.0 (architecture/workflow). Source CLI is 0.2.0 and is not on npm yet.
- JPEG/WebP/clipboard and story WebM are editor raster/motion paths. CLI raster is PNG; CLI video is FFmpeg MP4.
- A working-tree snapshot hash is not Git verification. verified requires a 40-character commit SHA whose blob matches snapshot.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- Sequence alt/opt fragments are modeled in this checkout. npm 0.1.0 does not validate them.
- Do not claim live agent prompt runs, Mermaid/draw.io import, hosted sharing, or a five-user study.

### Rejected approaches

- Copying another product's source, assets, or copy.
- Claiming a deferred feature is shipped.
- Inventing AI output or user-study evidence.

### Blockers

- none

### Evidence

- docs/runs/run-1788976728765-ddaf6b.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
