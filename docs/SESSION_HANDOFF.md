# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: chore/stamp-f060 @ 7e0dcafc5aa094682d4410b0f8cc10b79e9390cc (dirty)
- Updated: 2026-09-10T11:44:55.353Z

### Next action

Queue F061. Do not start until asked.

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

- https://github.com/ensp1re/mapgrain/pull/85
- https://github.com/ensp1re/mapgrain/actions/runs/34472624825

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
