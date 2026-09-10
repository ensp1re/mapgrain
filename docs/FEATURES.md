# Mapgrain features

Public table for the current checkout. Status values: shipped, partial, planned, deferred.

| Feature | Status | Notes |
| --- | --- | --- |
| Architecture diagrams | shipped | Typed nodes, directed edges, nested groups, stable IDs |
| Workflow diagrams | shipped | Jobs, actors, decisions with labelled outcomes, and group lanes |
| Sequence diagrams | shipped | Lifelines, ordered messages, and alt/opt fragments. npm `mapgrain@0.2.1` validates them; `0.1.0` still rejects them |
| Data-flow diagrams | shipped | Processes, stores, entities, and data movement, with process and store shapes |
| Lifecycle diagrams | shipped | States, initial/final markers, guarded transitions |
| Geometry diagnostics | shipped | Overlap, containment, clipping, label clearance as warnings. Arrange slides edge labels off nodes |
| Snapshot compare | shipped | Added/removed/changed nodes and edges via `mapgrain compare` |
| Direct edit, arrange, save, export | shipped | Production blank→export→reimport journey; Help overlay lists COMMANDS shortcuts; switching kind previews keep/remap/drop |
| Portable HTML viewer | shipped | Search, fit, reach, route, named views, local hashes |
| Offline editor | shipped | Versioned precache; API and studio sessions excluded |
| Agent skill | partial | Install paths proven; live agent prompt runs untested; matching CLI is `npx mapgrain@0.2.1` |
| Stories and role lenses | shipped | Viewer prev/next and role filter; source unchanged |
| Visual presets, share-card, video, localization | shipped | compact/comfortable/presentation; card PNG; story mp4; en/uk chrome |
| JPEG, WebP, clipboard image | partial | Editor JPEG/WebP download and PNG clipboard copy; CLI stays PNG/SVG/HTML/JSON |
| Browser story WebM | shipped | Editor MediaRecorder story capture at 1280×720; CLI video stays FFmpeg MP4 |
| Snapshot review HTML | partial | compare reports moved/rerouted IDs and can write Before/Delta/After HTML |
| Pinned Git evidence | shipped | diagnose may set verified for a 40-character commit blob; working-tree hash is snapshotMatches only |
| Watch/reload last-good agent file | shipped | `mapgrain watch` keeps last-good while JSON is invalid |
| Keyboard shortcut help | shipped | Help button, `?`, and command palette open a shortcut overlay from COMMANDS |
| Mermaid/draw.io import, hosted sharing | deferred | Demand not validated |
