# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: feat/harness-hygiene @ 0db065f5d7bceb7bf6347906f350c8a80a34e921 (dirty)
- Updated: 2026-09-08T22:15:43.879Z

### Next action

No live product tasks. Next id F043.

### Decisions

- Public CLI is npx mapgrain@0.1.0. Internals are bundled.
- Archive passing tasks. Keep PLAN, the live queue, and handoff as current-state only.
- Do not claim sequence fragments, live agent prompt runs, Mermaid/draw.io import, hosted sharing, or a five-user study.

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
