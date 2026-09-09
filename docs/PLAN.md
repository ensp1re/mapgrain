# Delivery plan

Mapgrain is a local editor, CLI (`npx mapgrain@0.1.0`), and agent skill. Users make a diagram by hand or through an agent, save JSON, and export SVG/PNG/HTML. No account.

**Status:** F044 active. Next task id after this slice: `F045`. Closed slices: [docs/archive/](archive/). Product facts: [PROJECT.md](PROJECT.md), [FEATURES.md](FEATURES.md), [CAPABILITY.md](CAPABILITY.md).

## Live slice

**F044 — export review and delivery gate.** JPEG/WebP/clipboard in the editor, compare moved/rerouted facts plus a Before/Delta/After HTML review, and diagnose --strict for overlap/clipping.

## Open gaps (not this slice)

- Browser WebM / route-story capture (distinct from FFmpeg story MP4)
- Optional pinned-revision Git verification
- Publishing `mapgrain@0.2.0` (npm `0.1.0` remains the last published package)
- Live agent prompt runs
- Sequence fragments (alt/opt)
- Mermaid/draw.io import and hosted sharing
- Five-user study / physical-device smoke
- README/social media recapture from the F043 production commit

Do not claim those as shipped.

## How work starts

Add one task in `docs/tasks.json`. A slice is `passing` only after local `verify`, a draft PR, and observed CI on the squash that landed on `main`. Archive it when it is passing so this file and the live queue stay short.
