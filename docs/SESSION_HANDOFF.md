# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: chore/stamp-f051 @ 67ecd5dabdab51217e693e7782328617835ac74e (dirty)
- Updated: 2026-09-09T20:13:50.000Z

### Next action

No live product tasks. Next id F052.

### Decisions

- Published npm CLI is npx mapgrain@0.2.0 (all five modes). Historical npx mapgrain@0.1.0 remains architecture/workflow only.
- JPEG/WebP/clipboard and story WebM are editor raster/motion paths. CLI raster is PNG; CLI video is FFmpeg MP4.
- A working-tree snapshot hash is not Git verification. verified requires a 40-character commit SHA whose blob matches snapshot.
- Sequence alt/opt fragments are in npm mapgrain@0.2.0. npm 0.1.0 still rejects them.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- Do not claim live agent prompt runs, Mermaid/draw.io import, or hosted sharing.
- The Codex HTML is a review prototype. Editor chrome follows its composition; Help, Focus, and Commands stay.

### Rejected approaches

- Copying another product's source, assets, or copy.
- Claiming a deferred feature is shipped.
- Inventing AI output or user-study evidence.

### Blockers

- none

### Evidence

- https://github.com/ensp1re/mapgrain/pull/66
- https://github.com/ensp1re/mapgrain/actions/runs/34399600010

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
