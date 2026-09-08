# Delivery plan

## Objective

Ship a local architecture/workflow editor with a companion agent skill and CLI. Users create a diagram by hand or through an existing coding agent, refine it visually, save it portably, and send offline HTML. No account or Mapgrain-managed model is required.

This plan supersedes broad feature expansion from the earlier brief. Visual direction from that brief still applies. Tracked against [PROJECT.md](PROJECT.md).

## State

- Status: `verified`
- Current task ID: F039
- Active slice: Usable-release Task 8 — outcome and performance gates
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
| F013 | Read-only viewer from the canonical scene | F004, F012 | unit, lint, typecheck, build | passing |
| F014 | 100-node fixture through validate, layout, and export | F003, F004, F012 | unit, lint, typecheck, build | passing |
| F015 | R1.1 Portable layout and export parity | F004, F007, F009, F012 | unit, lint, typecheck, build | passing |
| F016 | R1.2 One geometry pipeline | F015 | unit, lint, typecheck, build | passing |
| F017 | R1.3 Safe editing, selection, async layout | F015 | unit, lint, typecheck, build | passing |
| F018 | R1.4 Durable storage and safe CLI writes | F015, F012 | unit, lint, typecheck, build | passing |
| F019 | R2.1 Real creation without fake generation | F015, F017 | unit, lint, typecheck, build | passing |
| F020 | R2.2 Useful editing and export dialog | F019 | unit, lint, typecheck, build | passing |
| F021 | R2.3 Offline viewer people can use | F015, F013 | unit, lint, typecheck, build | passing |
| F022 | R3.1 Publishable CLI and studio | F015, F018 | unit, lint, typecheck, build | passing |
| F023 | R3.2 Companion agent skill | F015, F022 | unit, lint, typecheck, build | passing |
| F024 | R4 Visual and performance finish | F019, F021, F022 | unit, lint, typecheck, build | passing |
| F025 | R5 external user-study and device smoke | F024 | unit, lint, typecheck, build | blocked |
| F026 | P0.1 Stop the editor selection-loop crash | — | unit, lint, typecheck, build, browser | passing |
| F027 | P0.2 Protect Studio writes and document ownership | F026 | unit, lint, typecheck, build | passing |
| F028 | P0.3 Skill and distribution contract | F026 | unit, lint, typecheck, build | passing |
| F029 | P0.4 Exports and interactive viewer | F026 | unit, lint, typecheck, build | passing |
| F030 | P1 Coherent interface and custom Select | F026, F029 | unit, lint, typecheck, build | passing |
| F031 | P2 Interaction-path performance | F026 | unit, lint, typecheck, build | verified |
| F032 | Usable-release T1: export fidelity (resolved paints, captions, Inter, doctor pixels) | F029 | unit, lint, typecheck, build | passing |
| F033 | Usable-release T2: saving and Studio recovery | F032 | unit, lint, typecheck, build | passing |
| F034 | Usable-release T3: actual offline support | F032 | unit, lint, typecheck, build | passing |
| F035 | Usable-release T4: editor shell and spacing | F030 | unit, lint, typecheck, build | passing |
| F036 | Usable-release T5: readable diagrams and interaction | F035 | unit, lint, typecheck, build | passing |
| F037 | Usable-release T6: portable viewing | F032 | unit, lint, typecheck, build | passing |
| F038 | Usable-release T7: skill install and agent workflows | F028 | unit, lint, typecheck, build | passing |
| F039 | Usable-release T8: outcome and performance gates | F032, F036 | unit, lint, typecheck, build, browser | verified |
| F040 | Full product T9: remaining feature gaps (modes, diagnostics, stories) | F039 | unit, lint, typecheck, build | not_started |

The master product brief (usable release then full product) supersedes the shorter V3 plan for remaining scope. F025 stays blocked on external user-study evidence. Do not start hosted sharing or billing. README media rewrite is last, after F039.

## Stages

| Stage | Outcome |
| --- | --- |
| R1 | A diagram survives editing, backup, reload, and export without changing appearance or meaning |
| R2 | A new user can create and finish a diagram without editing JSON |
| R3 | A clean machine can install and generate a useful diagram |
| R4 | Diagram and controls are readable, responsive, consistent, and measured |
| R5 | Browser, offline, package, and recovery journeys pass |

## Checkpoints

- After F005: original visual specimen exists in the running app, both themes, before more features.
- After F010: offline loop works; failed edits preserve the last valid document.
- Each slice lands on a feature branch with a draft PR. `main` is not a working branch.

## Closeout

A slice is `passing` only after local `verify`, a draft PR, and observed CI on the implementation revision.
