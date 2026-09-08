# Capability ledger

Evidence baseline: `02d0145` (2026-09-08). This ledger tracks the master product brief. A usable release is an intermediate gate; missing rows stay outstanding against the full product.

| Capability | Status | Tested | Notes |
| --- | --- | --- | --- |
| Architecture diagrams (typed nodes, directed edges, nested groups, stable IDs) | implemented | yes | Fixtures cover nested groups, parallel edges, cycles, long labels |
| Workflow / sequence / data-flow / lifecycle modes | missing | no | Architecture/workflow kinds exist; dedicated mode semantics are Task 9 |
| Blank / open / three examples / agent setup on start | implemented | partial | Start surface exists; agent setup is copy, not a picker with troubleshooting |
| Direct edit, connect, arrange preview, undo, export | implemented | partial | Browser journeys are thin; full Task 8 journey is outstanding |
| Save status, last-active reopen, Studio conflict recovery | implemented | yes | F033: last-active id, last-opened vs edited times, Saved after durable write, structured Studio errors |
| Offline first session (SW + worker + export) | implemented | yes | F034: versioned asset manifest, atomic precache, API/session excluded; production disconnect journey |
| Responsive shell 1440→390 | implemented | yes | F035: compact Add, disabled Chat, exclusive narrow panels, no page-level horizontal scroll |
| Readable default labels after fit | partial | no | 14px declared; not proven after default fit (Task 5) |
| Portable HTML viewer: search, fit, theme, pan, zoom | partial | partial | Present; reach/route/named views/deep links are Task 6 |
| Directed reach, route, named views, stories, lenses | missing | no | Task 6 / P2 |
| CLI validate/layout/view/export/doctor/studio | implemented | yes | `mapgrain@0.1.0` on npm; internals bundled |
| Agent skill install + live tasks across agents | partial | partial | Skill ships; unpublished `npx` copy is stale; Task 7 matrix incomplete |
| Export fidelity (resolved paints, captions, Inter, doctor pixels) | implemented | yes | F032: CLI SVG/PNG use hex paints; viewer SVG stays themed; doctor samples PNG pixels |
| Geometry diagnostics, snapshot compare, watch/reload | missing | no | Task 9 / P3 |
| Visual presets, share-card, video, localization | missing | no | Task 9 / P4; deferred until static fidelity |
| Five-user study / physical-device smoke | deferred | no | F025 blocked: participants and devices are not available here |
| Mermaid/draw.io import, hosted sharing | deferred | no | Demand not validated; out of first usable release |

Status values: `implemented`, `partial`, `missing`, `deferred`.
