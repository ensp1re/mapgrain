# Session handoff

This is a readable view of `docs/harness/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/harness/PLAN.md
- Git: feat/document-schema @ 6fdde2cef44474f62146c348491c6ef9edf24d33 (dirty)
- Updated: 2026-09-07T13:03:55.681Z

### Next action

After the harness PR lands, activate F001 and implement the versioned document schema with original fixtures.

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

- docs/harness/runs/run-1788786216210-fddf29.json

## Resume

Run `node --experimental-strip-types scripts/harness/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
