# Delivery plan

Mapgrain is a local editor, CLI (`npx mapgrain@0.2.2`), and agent skill. Users make a diagram by hand or through an agent, save JSON, and export SVG/PNG/HTML. No account.

**Status:** shipped through F063. Live slice: `F064` (editor crash repair and design system), then `F065` (predictable editing and discoverability). Next task id: `F066`. Closed slices: [docs/archive/](archive/). Product facts: [PROJECT.md](PROJECT.md), [FEATURES.md](FEATURES.md), [CAPABILITY.md](CAPABILITY.md).

## Open gaps (not queued)

- Live agent prompt runs
- Mermaid/draw.io import and hosted sharing

Do not claim those as shipped.

## How work starts

Add one task in `docs/tasks.json`. A slice is `passing` only after local `verify`, a draft PR, and observed CI on the squash that landed on `main`. Archive it when it is passing so this file and the live queue stay short.
