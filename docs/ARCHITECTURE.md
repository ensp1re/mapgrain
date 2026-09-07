# Architecture

## System boundary

Mapgrain owns the diagram document, scene, layout, editor, viewer, and CLI. It does not own model providers, git hosts, or object storage. Hosted API, accounts, and sharing are outside the local alpha boundary.

## Stack decisions

| Choice | Decision | Why |
| --- | --- | --- |
| Language | TypeScript throughout | One contract for UI, CLI, and tests |
| Runtime | Node.js 24 LTS (`>=24 <27`) | Current Active LTS as of 7 Sep 2026. Node 26 is Current, not LTS until late October |
| Packages | pnpm workspaces | Native workspaces, strict deps, no extra orchestrator until there are packages to graph |
| Editor | React + Vite, later | Maintainable direct-manipulation UI |
| Canvas | React Flow, custom nodes/edges | Interaction only; not the source of truth |
| Layout | ELK.js in a worker | Geometry is deterministic code, not a model |
| Tests | `node:test` | No extra runner until browser tests exist |
| Lint | ESLint 9 flat + typescript-eslint | One config at the root |
| Hooks | Husky + lint-staged + commitlint | Lint, tests, and build on commit; conventional messages |
| Types | `types/` and `constants/` per package | Named contracts live with the domain, not in implementation files |

Rejected for now: Turborepo/Nx (nothing to cache), copying another product's source, shipping the editor inside HTML exports.

## Intended layout

```text
apps/editor                 # local workspace UI
apps/api                    # added only with hosted capabilities
packages/document           # schema, types, migrations, operations
packages/scene              # text metrics, geometry, styles
packages/layout             # worker, adapter, constraints
packages/renderer           # deterministic SVG and export
packages/viewer             # small read-only bundle
packages/ai                 # typed adapters, later
packages/importers          # bounded syntax import, later
packages/cli                # validate, render, export
scripts                     # native work-queue runner
tests                       # runner contract tests and original fixtures
tests/fixtures              # original product fixtures, later
```

Those app and package directories are created when the owning task starts. Do not add empty stubs.

## Responsibilities

| Area | Owner | Inputs | Outputs | Invariants |
| --- | --- | --- | --- | --- |
| Document | `packages/document` | operations on a revision | validated document | IDs stable; portable `layout` holds positions, not viewport/selection |
| Scene | `packages/scene` | document + fonts + layout options | bounds, ports, routes | identical for editor and export |
| Layout | `packages/layout` | document + pins | positions or a visible conflict | pins never dropped silently |
| Renderer | `packages/renderer` | scene | SVG/PNG/HTML/JSON | no editor DOM screenshots |
| Editor | `apps/editor` | document operations | user edits, previews | AI apply cannot clobber newer manual edits |
| CLI | `packages/cli` (public `mapgrain`) | files | validate/render/export/view/doctor/studio | bundled internals; same schema as the UI |
| Work queue | `scripts` | queue + checks | JSON status | no product success without recorded evidence |

## Data and control flow

Normal path: document operation → validate → (optional layout) → scene → editor and exporter.

Failure path: invalid operation is rejected; previous document remains. Layout conflict is a first-class result. Worker responses that arrive after a newer request are discarded.

Persistence: IndexedDB for local documents; JSON download as backup. Viewport/selection stored separately.

## Interfaces

- Document JSON: `schemaVersion`, `id`, `revision`, `kind`, `title`, `nodes`, `edges`, `groups`, `views`, `layoutHints`, `theme`, optional `evidence`.
- Operations: validated against a base revision, each with an inverse for undo.
- Generation jobs (later): typed semantic document or typed edit; local re-validation required.
- Errors: code, affected element, user message, retryability.

## Change guide

Create a package when the first real module lands. Keep dependency direction `document → scene → layout/renderer → editor/cli`. Shared types never import app code. Prefer `import type` for erased contracts.
