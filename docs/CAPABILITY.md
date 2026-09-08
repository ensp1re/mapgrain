# Capability ledger

Evidence baseline: `02d0145` (2026-09-08). This ledger tracks the master product brief. A usable release is an intermediate gate; missing rows stay outstanding against the full product.

| Capability | Status | Tested | Notes |
| --- | --- | --- | --- |
| Architecture diagrams (typed nodes, directed edges, nested groups, stable IDs) | implemented | yes | Fixtures cover nested groups, parallel edges, cycles, long labels |
| Workflow / sequence / data-flow / lifecycle modes | implemented | yes | F040: mode-specific node/edge rules, fixtures, editor palette, CLI validate/export/view |
| Blank / open / three examples / agent setup on start | implemented | partial | Start surface exists; agent setup is copy, not a picker with troubleshooting |
| Direct edit, connect, arrange preview, undo, export | implemented | yes | F039: production blank→edit→export→reimport journey; selection p95 through next paint |
| Save status, last-active reopen, Studio conflict recovery | implemented | yes | F033: last-active id, last-opened vs edited times, Saved after durable write, structured Studio errors |
| Offline first session (SW + worker + export) | implemented | yes | F034: versioned asset manifest, atomic precache, API/session excluded; production disconnect journey |
| Responsive shell 1440→390 | implemented | yes | F035: compact Add, disabled Chat, exclusive narrow panels, no page-level horizontal scroll |
| Readable default labels after fit | implemented | yes | F036: default fit floors zoom so 14px labels stay ≥12px; zoom % visible; dialogs trap focus |
| Portable HTML viewer: search, fit, theme, pan, zoom | implemented | yes | F037: fit, search-to-focus, theme, pan, zoom, keyboard, fullscreen; no remote assets |
| Directed reach, route, named views, stories, lenses | partial | partial | F037 ships reach/route/named views; stories and role lenses remain planned |
| CLI validate/layout/view/export/doctor/studio | implemented | yes | `mapgrain@0.1.0` on npm; internals bundled |
| Agent skill install + live tasks across agents | partial | partial | F038: SKILL.md pins `npx mapgrain@0.1.0`; install paths tested; live agent tasks remain untested |
| Export fidelity (resolved paints, captions, Inter, doctor pixels) | implemented | yes | F032: CLI SVG/PNG use hex paints; viewer SVG stays themed; doctor samples PNG pixels |
| Geometry diagnostics, snapshot compare, watch/reload | partial | partial | F040: diagnose warnings and `mapgrain compare`; watch/reload remains planned |
| Visual presets, share-card, video, localization | missing | no | Task 9 / P4; deferred until static fidelity |
| Five-user study / physical-device smoke | deferred | no | F025 blocked: participants and devices are not available here |
| Mermaid/draw.io import, hosted sharing | deferred | no | Demand not validated; out of first usable release |

Status values: `implemented`, `partial`, `missing`, `deferred`.
