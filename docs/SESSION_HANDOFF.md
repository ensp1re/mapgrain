# Session handoff

This is a readable view of `docs/handoff.json`. Update decisions, rejected approaches, blockers, and nextAction in that JSON source. The handoff command preserves them while refreshing git and task facts.

## Current checkpoint

- Task: F023
- Plan: docs/PLAN.md
- Git: feat/agent-skill @ 8bb33811b00dea040bfab7a039e0f544eb1338ef (dirty)
- Updated: 2026-09-07T19:53:49.122Z

### Next action

Open a draft PR for F023. Merge when GitHub verify succeeds. Next is F024.

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
- The public CLI package is mapgrain. Internals are bundled; @resvg/resvg-js and elkjs stay real dependencies. Studio binds 127.0.0.1, checks origin/session, and writes only the opened file.
- The companion skill lives at skills/mapgrain. Agents emit semantic JSON, call the CLI, preserve ids and layout, and must not execute a repository to discover architecture.
- The read-only viewer wraps the canonical SVG export. It has no editor chrome and no GUI dependency.
- The 100-node Local telemetry mesh fixture is original. Validate, scene, layout, SVG export, and CLI succeed on it. Performance targets are still unclaimed.
- The usable-release plan supersedes feature expansion. Current work is R1 correctness. Portable layout lives on the document and is used by editor, backup, import, CLI, and SVG/PNG/HTML export. Viewport and selection stay out.
- Editor edges follow canonical scene polylines. Direction none/forward/both is visible. Text measurement uses Inter-like glyph classes including CJK and Cyrillic. Node size reserves a kind line.
- Arrange results are bound to document id plus document and layout revisions. Presentation mode blocks mutating commands. Theme is a document property.

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
- Starting R6 imports, hosted sharing, or billing before R1–R5.

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
- docs/runs/run-1788805672118-b8d681.json
- docs/runs/run-1788806341421-3200fb.json
- docs/runs/run-1788806830014-5101bb.json
- docs/runs/run-1788807243525-161da0.json
- docs/runs/run-1788807797035-89e364.json
- docs/runs/run-1788808155658-391fbf.json
- docs/runs/run-1788808466921-89a20d.json
- docs/runs/run-1788810303070-9860f2.json

## Resume

Run `node --experimental-strip-types scripts/cli.ts --root . context`, inspect discrepancies, and follow the recorded next action.
