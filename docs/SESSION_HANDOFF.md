# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: F050
- Plan: docs/PLAN.md
- Git: feat/npm-0.2.0-pins @ 10fb16389d3ce887e2c7887c2067c7038d849f52 (dirty)
- Updated: 2026-09-09T19:51:31.400Z

### Next action

Implement F050 pin retarget, verify, draft PR against main.

### Decisions

- Published npm CLI is npx mapgrain@0.2.0 (all five modes). Historical npx mapgrain@0.1.0 remains architecture/workflow only.
- JPEG/WebP/clipboard and story WebM are editor raster/motion paths. CLI raster is PNG; CLI video is FFmpeg MP4.
- A working-tree snapshot hash is not Git verification. verified requires a 40-character commit SHA whose blob matches snapshot.
- Sequence alt/opt fragments are in npm mapgrain@0.2.0. npm 0.1.0 still rejects them.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- Do not claim live agent prompt runs, Mermaid/draw.io import, or hosted sharing.

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
