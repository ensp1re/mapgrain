# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: feat/export-renderer @ 06d0c55513974280ce57ff994db4ac1a89a1e571 (dirty)
- Updated: 2026-09-07T13:53:01.366Z

### Next action

Merge this PR, then activate F005 (visual specimen in a working app).

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

- docs/runs/run-1788789116576-b79046.json
- docs/runs/run-1788789132847-14f4ca.json
- docs/runs/run-1788789147079-3f13b7.json
- docs/runs/run-1788789163369-3ddabe.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
