# Delivery plan

Mapgrain is a local editor, CLI (`npx mapgrain@0.1.0`), and agent skill. Users make a diagram by hand or through an agent, save JSON, and export SVG/PNG/HTML. No account.

**Status:** F043 locally verified. Next task id after this slice: `F044`. Closed slices: [docs/archive/](archive/). Product facts: [PROJECT.md](PROJECT.md), [FEATURES.md](FEATURES.md), [CAPABILITY.md](CAPABILITY.md).

## Live slice

**F043 — V4 usable diagrams.** Restore clipped chrome, one presentation contract (icons, kind metrics, exports), sequence editor geometry, mode chooser, and honest CLI/skill pins. Visual target is the V4 review prototype; do not copy its dummy graph.

## Open gaps (not this slice)

- Sequence fragments (alt/opt)
- Live agent prompt runs
- Publishing `mapgrain@0.2.0` (npm `0.1.0` stays the last published package)
- JPEG/WebP/clipboard/WebM, Before/Delta/After review UI, pinned Git evidence, quality-gated last-good delivery
- Mermaid/draw.io import and hosted sharing
- Five-user study / physical-device smoke

Do not claim those as shipped.

## How work starts

Add one task in `docs/tasks.json`. A slice is `passing` only after local `verify`, a draft PR, and observed CI on the squash that landed on `main`. Archive it when it is passing so this file and the live queue stay short.
