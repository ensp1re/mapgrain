# Project specification

## Outcome

An engineer can turn a short description, a supported diagram source, or a small original example into an editable architecture or workflow map, correct it without a DSL, and export JSON, SVG, PNG, or offline HTML that matches the editor.

The working product name is Mapgrain. Final naming, domain, and trademark work are separate and not claimed here.

## Scope

### In scope (local alpha)

- Architecture and workflow diagrams
- Description input and three original examples
- Direct editing, undo, pin/keep-position, arrange-with-preview
- Automatic layout in a worker
- Local persistence and downloadable backup
- Canonical JSON / SVG / PNG / HTML export
- Basic agent CLI: validate, render, export
- Original visual system for nodes, edges, groups, and chrome

### Out of scope (first release)

- Accounts, subscriptions, billing
- Repository crawling and multiplayer
- Sequence, data-flow, and lifecycle modes
- Full syntax compatibility for third-party diagram languages
- Hosted sharing, comments, and permissioned libraries
- Video, PDF, style kits, and presentation chapters
- Executing or trusting analyzed repositories as code

## Requirements and acceptance

| ID | Requirement | Acceptance evidence | Status |
| --- | --- | --- | --- |
| R-001 | Versioned document contract shared by UI, CLI, and adapters | Schema + generated types + runtime validation tests | active |
| R-002 | Canonical scene used by editor and export | Same bounds/text/ports/edges for a fixture in editor and SVG | active |
| R-003 | Layout does not silently drop pins | Conflict is visible when space is insufficient | active |
| R-004 | Create → edit → reload → export works offline | IndexedDB round-trip plus export files; no fake actions | active |
| R-005 | Failed edits preserve the last valid diagram | Integration test for a rejected operation | active |
| R-006 | Exports omit secrets, comments, and transient selection | Export fixture assertions | active |
| R-007 | First session examples work without a model provider | Example loads and edits with credentials unset | active |
| R-008 | Quality gates run on commit and CI | `pnpm verify` and `.github/workflows/ci.yml` | active |

## Constraints

- Supported runtime: Node.js 24 LTS for CLI and CI; editor is TypeScript, React, Vite.
- Local-first: no account required to inspect or edit examples.
- Generation requires an explicitly configured provider. Never present sample content as model output.
- One portable document. Viewport and selection are not part of meaning.
- Node and edge IDs are immutable and independent of labels.
- Meaning, layout preferences, computed scene, and viewing state stay separate.
- Dark mode first. Restrained charcoal surfaces, one indigo accent, 4px spacing, 48px top bar, collapsible outline, contextual inspector. Chat is not a permanent panel.
- Do not ship generic flowchart defaults as the finished diagram look.
- Performance targets are hypotheses until measured on a documented device and the 100-node fixture.

## Interfaces and dependencies

Planned packages: `packages/document`, `packages/scene`, `packages/layout`, `packages/renderer`, `packages/viewer`, `packages/cli`, later `packages/ai` and `packages/importers`, plus `apps/editor`. Hosted `apps/api` is added only with sharing or hosted generation.

Chosen libraries for later slices: React Flow for canvas interaction, ELK.js in a worker for layout. Library graph state is not the persisted document.

See [ARCHITECTURE.md](ARCHITECTURE.md).

## Verification contract

Local command: `pnpm verify` (lint, typecheck, test, harness validate). CI: [.github/workflows/ci.yml](../.github/workflows/ci.yml). Product slices must add tests that cover their acceptance rows before `verify ID`.
