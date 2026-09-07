# Delivery plan

## Objective

Ship a local editor that can create, correct, and export a small architecture or workflow diagram. Tracked against [PROJECT.md](PROJECT.md).

## State

- Status: `active`
- Current task ID: F013
- Active slice: read-only viewer
- Base branch: `main`
- Tracking record: [tasks.json](tasks.json)
- Current handoff: [SESSION_HANDOFF.md](SESSION_HANDOFF.md)

## Slices

| ID | Slice and expected behavior | Dependencies | Verification | Status |
| --- | --- | --- | --- | --- |
| F001 | Versioned document schema, generated types, runtime validation, original fixtures | — | unit, lint, typecheck, build | passing |
| F002 | Canonical scene graph: bounds, text, ports, edges, groups | F001 | unit, lint, typecheck, build | passing |
| F003 | ELK worker layout spike: nesting, cycles, pins, parallel edges | F002 | unit, lint, typecheck, build | passing |
| F004 | Deterministic SVG/PNG/HTML/JSON export from the scene | F002 | unit, lint, typecheck, build | passing |
| F005 | Visual specimen in a working app: chrome, node, edge, inspector, one interactive diagram | F003, F004 | unit, lint, typecheck, build | passing |
| F006 | Editor shell: top bar, canvas, outline, command menu | F005 | unit, lint, typecheck, build | passing |
| F007 | Direct editing, undo/redo, keep-position | F006 | unit, lint, typecheck, build | passing |
| F008 | Arrange preview and visible pin conflicts | F007 | unit, lint, typecheck, build | passing |
| F009 | IndexedDB persistence and backup download | F006 | unit, lint, typecheck, build | passing |
| F010 | Offline create → edit → reload → export | F004, F007, F008, F009 | unit, lint, typecheck, build | passing |
| F011 | Example-backed first session; no fake generation | F006 | unit, lint, typecheck, build | passing |
| F012 | CLI validate / render / export | F001, F004 | unit, lint, typecheck, build | passing |
| F013 | Read-only viewer from the canonical scene | F004, F012 | unit, lint, typecheck, build | active |

Later milestones (sequence mode, revisions, hosted sharing, repository evidence) stay in [PROJECT.md](PROJECT.md). Do not start them in this queue.

## Checkpoints

- After F005: original visual specimen exists in the running app, both themes, before more features.
- After F010: offline loop works; failed edits preserve the last valid document.
- Each slice lands on a feature branch with a draft PR. `main` is not a working branch.

## Closeout

A slice is `passing` only after local `verify`, a draft PR, and observed CI on the implementation revision.
