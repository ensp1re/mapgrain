# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: chore/stamp-f049 @ d2205d27462cb55a114398fcae6d81772ee5bad6 (dirty)
- Updated: 2026-09-09T19:40:06.311Z

### Next action

Publish mapgrain@0.2.0, then retarget docs/skill pins from 0.1.0.

### Decisions

- Published npm CLI is npx mapgrain@0.1.0 (architecture/workflow). Matching five-mode CLI is packed mapgrain-0.2.0.tgz. Source CLI is 0.2.0 and is not on npm yet.
- JPEG/WebP/clipboard and story WebM are editor raster/motion paths. CLI raster is PNG; CLI video is FFmpeg MP4.
- A working-tree snapshot hash is not Git verification. verified requires a 40-character commit SHA whose blob matches snapshot.
- Sequence alt/opt fragments are modeled in this checkout. npm 0.1.0 does not validate them.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- Do not claim live agent prompt runs, Mermaid/draw.io import, or hosted sharing.

### Rejected approaches

- Copying another product's source, assets, or copy.
- Claiming a deferred feature is shipped.
- Inventing AI output or user-study evidence.

### Blockers

- none

### Evidence

- https://github.com/ensp1re/mapgrain/pull/62
- https://github.com/ensp1re/mapgrain/actions/runs/34396175957

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
