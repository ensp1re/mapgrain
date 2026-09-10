# Capability ledger

Evidence baseline: `02d0145` (2026-09-08). This ledger tracks the master product brief. A usable release is an intermediate gate; missing rows stay outstanding against the full product.

| Capability | Status | Tested | Notes |
| --- | --- | --- | --- |
| Architecture diagrams (typed nodes, directed edges, nested groups, stable IDs) | implemented | yes | Fixtures cover nested groups, parallel edges, cycles, long labels |
| Workflow / sequence / data-flow / lifecycle modes | implemented | yes | npm `mapgrain@0.2.2` validates all five modes including sequence alt/opt fragments; historical `0.1.0` does not |
| Blank / open / three examples / agent setup on start | implemented | partial | Start surface exists; agent setup is copy, not a picker with troubleshooting |
| Direct edit, connect, arrange preview, undo, export | implemented | yes | F039: production blank→edit→export→reimport journey; selection p95 through next paint; F049 Help overlay lists COMMANDS shortcuts; F062 switching kind previews keep/remap/drop |
| Save status, last-active reopen, Studio conflict recovery | implemented | yes | F033: last-active id, last-opened vs edited times, Saved after durable write, structured Studio errors |
| Offline first session (SW + worker + export) | implemented | yes | F034: versioned asset manifest, atomic precache, API/session excluded; production disconnect journey |
| Responsive shell 1440→390 | partial | yes | Content-driven header collapse and unclipped overlays in F043; remaining widths still need production hit-tests |
| Readable default labels after fit | partial | yes | Fit all shows the whole graph; Focus keeps labels readable. Default open uses Fit all |
| Portable HTML viewer: search, fit, theme, pan, zoom | implemented | yes | F037: fit, search-to-focus, theme, pan, zoom, keyboard, fullscreen; no remote assets |
| Directed reach, route, named views, stories, lenses | implemented | yes | F037 reach/route/views; F042 stories and role lenses in exported HTML |
| CLI validate/layout/view/export/doctor/studio | implemented | yes | npm `mapgrain@0.2.2` is last published and validates all five modes outside the monorepo |
| Agent skill install + live tasks across agents | partial | partial | Install paths tested; live agent tasks untested; skill uses `npx mapgrain@0.2.2` and must not send sequence fixtures to `npx mapgrain@0.1.0` |
| Export fidelity (resolved paints, captions, Inter, doctor pixels) | implemented | yes | F032: CLI SVG/PNG use hex paints; viewer SVG stays themed; doctor samples PNG pixels |
| Geometry diagnostics, snapshot compare, watch/reload | partial | yes | diagnose --strict fails on overlap/clipping; compare includes moved/rerouted IDs and optional HTML review; Git verified is a pinned commit blob, not a working-tree hash |
| JPEG/WebP/clipboard export | partial | yes | Editor-only raster formats and clipboard PNG; CLI does not encode JPEG/WebP |
| Browser story WebM | implemented | yes | Editor MediaRecorder records story steps at 1280×720 and can cancel; CLI video remains FFmpeg MP4 |
| Visual presets, share-card, video, localization | implemented | yes | Presets change scene metrics; card PNG; story mp4; en/uk viewer chrome |
| Mermaid/draw.io import, hosted sharing | deferred | no | Demand not validated; out of first usable release |

Status values: `implemented`, `partial`, `missing`, `deferred`.
