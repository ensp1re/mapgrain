# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: feat/v4-matching-tarball @ 6a48bd4e2c91d95e6ffe65605296f08d4a8e07ce (dirty)
- Updated: 2026-09-09T18:58:54.852Z

### Next action

F048 is locally verified. Push a draft PR against main.

### Decisions

- Published npm CLI is npx mapgrain@0.1.0 (architecture/workflow). Source CLI is 0.2.0 and is not on npm yet.
- JPEG/WebP/clipboard and story WebM are editor raster/motion paths. CLI raster is PNG; CLI video is FFmpeg MP4.
- A working-tree snapshot hash is not Git verification. verified requires a 40-character commit SHA whose blob matches snapshot.
- Sequence alt/opt fragments are modeled in this checkout. npm 0.1.0 does not validate them.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- Do not claim live agent prompt runs, Mermaid/draw.io import, hosted sharing, or a five-user study.

### Rejected approaches

- Copying another product's source, assets, or copy.
- Claiming a deferred feature is shipped.
- Inventing AI output or user-study evidence.

### Blockers

- none

### Evidence

- docs/runs/run-1788980308007-d9869f.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
