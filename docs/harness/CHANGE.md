# Change record: development harness

## Problem and expected behavior

The repository was an empty git tree. A later coding session could not resume without a product spec, a work queue, a native runner, and quality gates that fail closed.

This slice adds those, and queues product work. It does not implement the editor.

## Scope

### Included

- AGENTS router and harness documents
- Native Node/TypeScript runner with JSON commands
- ESLint, `tsc`, `node:test`, Husky, commitlint, GitHub Actions
- Stepwise product queue F001–F012
- README that states the project is not ready

### Excluded

- Editor, layout engine integration, exporters
- App and package scaffolding beyond documented intent
- Hosted services

## Design and decisions

- Node 24 LTS, pnpm, no monorepo orchestrator yet.
- Harness is TypeScript under `scripts/harness/` with `types/` and `constants/` modules.
- `pnpm build` is currently `tsc --noEmit`; package emit starts with F001.
- Delivery is always a feature branch and a draft PR.

## Verification

- Local command: `pnpm verify` — passed (eslint, tsc, 19 harness tests, validate ok)
- Black-box probe against this runner — passed
- Scenario probe: fail/empty/handoff cases passed; cases that need a verified product task remain unavailable
- CI definition: [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

## Delivery

Feature branch `chore/bootstrap-harness` against `main`. Draft PR. Do not merge from this record.
