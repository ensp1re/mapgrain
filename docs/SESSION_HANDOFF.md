# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: feat/document-schema @ cdd14de210f95ba5c97d6156cddf653ebfaf6e4f (dirty)
- Updated: 2026-09-07T13:08:36.677Z

### Next action

Merge this PR, then activate F002 (canonical scene graph).

### Decisions

- Working name is Mapgrain; final name is pending.
- Node 24 LTS, pnpm workspaces, no extra monorepo orchestrator until packages exist.
- React + Vite editor later; shared document/scene/layout/renderer packages; exports never embed the editor.
- Quality gates: ESLint, tsc, node:test, Husky pre-commit, commitlint, GitHub Actions.
- Product work is queued as F001–F012. This slice does not implement the editor.

### Rejected approaches

- Adding Turborepo or Nx before there are packages to orchestrate.
- Implementing the editor in the harness bootstrap.
- Copying another product's source, assets, or copy.
- Empty app/package stubs that exist only to look like a monorepo.

### Blockers

- none

### Evidence

- docs/runs/run-1788786501280-05ea42.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
