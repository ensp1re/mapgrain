# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: F054
- Plan: docs/PLAN.md
- Git: feat/png-node-labels @ 78eef36ee86841c51d57d04009e00cc9a9efde01 (dirty)
- Updated: 2026-09-09T21:57:23.772Z

### Next action

Verify F054, open a draft PR for labeled PNG export.

### Decisions

- Published npm CLI is npx mapgrain@0.2.1. Source CLI is 0.2.1. Historical npx mapgrain@0.1.0 remains architecture/workflow only. npm 0.2.0 stays published and must not be overwritten.
- JPEG/WebP/clipboard and story WebM are editor raster/motion paths. CLI raster is PNG; CLI video is FFmpeg MP4.
- A working-tree snapshot hash is not Git verification. verified requires a 40-character commit SHA whose blob matches snapshot.
- Sequence alt/opt fragments are in npm mapgrain@0.2.1 and 0.2.0. npm 0.1.0 still rejects them.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- Do not claim live agent prompt runs, Mermaid/draw.io import, or hosted sharing.
- The Codex HTML is a review prototype. Editor chrome follows its composition; Help, Focus, and Commands stay.
- Do not overwrite 0.1.0 or 0.2.0. Do not pin @latest.

### Rejected approaches

- Copying another product's source, assets, or copy.
- Claiming a deferred feature is shipped.
- Inventing AI output or user-study evidence.

### Blockers

- none

### Evidence

- none

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
