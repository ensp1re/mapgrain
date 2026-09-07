# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: feat/direct-editing @ 06b4b6c0bd8b938fdfeafab8669a9f7b81f07d5a (dirty)
- Updated: 2026-09-07T16:13:25.781Z

### Next action

Open a draft PR for F007. Wait for CI. Do not merge until asked.

### Decisions

- Working name is Mapgrain; final name is pending.
- Node 24 LTS, pnpm workspaces, no extra monorepo orchestrator until packages exist.
- React + Vite editor; shared document/scene/layout/renderer packages; exports never embed the editor.
- Quality gates: ESLint, tsc, node:test, Husky pre-commit, commitlint, GitHub Actions.
- Document operations live in packages/document with inverses. Editor history stores document plus node positions so a label change does not rearrange other nodes.
- New connections record explicit type and direction before they are committed.

### Rejected approaches

- Adding Turborepo or Nx before there are packages to orchestrate.
- Implementing the editor in the harness bootstrap.
- Copying another product's source, assets, or copy.
- Empty app/package stubs that exist only to look like a monorepo.
- Rebuilding default sequential placement after a label edit.

### Blockers

- none

### Evidence

- docs/runs/run-1788793426730-62496d.json
- docs/runs/run-1788793439005-079954.json
- docs/runs/run-1788793452150-7deaf4.json
- docs/runs/run-1788793463994-b89e11.json
- docs/runs/run-1788793476030-054c9f.json
- docs/runs/run-1788793487911-4323db.json
- docs/runs/run-1788797500629-e310ff.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
