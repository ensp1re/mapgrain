# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: none
- Plan: docs/PLAN.md
- Git: feat/hundred-node-fixture @ c41e9e73ec0a51de95de4c21c78577337367abc9 (dirty)
- Updated: 2026-09-07T17:59:49.470Z

### Next action

Open a draft PR for F014. Wait for CI. Do not merge until asked.

### Decisions

- Working name is Mapgrain; final name is pending.
- Node 24 LTS, pnpm workspaces, no extra monorepo orchestrator until packages exist.
- React + Vite editor; shared document/scene/layout/renderer packages; exports never embed the editor.
- Quality gates: ESLint, tsc, node:test, Husky pre-commit, commitlint, GitHub Actions.
- Document operations live in packages/document with inverses. Editor history stores document plus node positions so a label change does not rearrange other nodes.
- New connections record explicit type and direction before they are committed.
- Arrange runs ELK off the UI thread, shows a preview with Apply/Discard, and never silently drops keep-position pins.
- Autosave writes document and positions to IndexedDB. Saved/Saving/Recovery are visible in the top bar. A failed write offers a JSON backup download.
- A production service worker caches same-origin GET so edit, reload, and export work with the network disabled. Chat does not invent a reply.
- First session is an example-backed start surface. Submit without a provider fails honestly, keeps the prompt, and offers a repair. Examples are never labelled as generated output.
- The product CLI lives in packages/cli, uses the same document and renderer as the editor, and does not depend on the GUI.
- The read-only viewer wraps the canonical SVG export. It has no editor chrome and no GUI dependency.
- The 100-node Local telemetry mesh fixture is original. Validate, scene, layout, SVG export, and CLI succeed on it. Performance targets are still unclaimed.

### Rejected approaches

- Adding Turborepo or Nx before there are packages to orchestrate.
- Implementing the editor in the harness bootstrap.
- Copying another product's source, assets, or copy.
- Empty app/package stubs that exist only to look like a monorepo.
- Rebuilding default sequential placement after a label edit.
- Running nested ELK workers inside the editor layout worker.
- Adding an IndexedDB wrapper library for a single object store.
- Adding vite-plugin-pwa for a single cache-first worker.
- Walking fake interpreting/arranging/checking stages as if a model ran.
- Adding Commander or another parser for three CLI commands.
- Building the viewer on React Flow.
- Claiming a layout-time target before measuring on a documented device.

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
- docs/runs/run-1788798663725-8d9cdf.json
- docs/runs/run-1788799557750-b00ce7.json
- docs/runs/run-1788800481010-e56765.json
- docs/runs/run-1788801310224-cc1501.json
- docs/runs/run-1788802146185-c8b4da.json
- docs/runs/run-1788802738494-8e738b.json
- docs/runs/run-1788803958032-669084.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
