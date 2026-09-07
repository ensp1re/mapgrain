# Session handoff

This is a readable view of `docs/harness/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/harness/PLAN.md
- Git: chore/bootstrap-harness @ 783ac192987f98d2c2c7e0b259e13f24b8aed500 (dirty)
- Updated: 2026-09-07T12:43:15.933Z

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

- none

## Resume

Run `node --experimental-strip-types scripts/harness/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
