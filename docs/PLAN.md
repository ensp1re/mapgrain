# Delivery plan

Mapgrain is a local editor, CLI (`npx mapgrain@0.2.0`), and agent skill. Users make a diagram by hand or through an agent, save JSON, and export SVG/PNG/HTML. No account.

**Status:** shipped through F050. No live slices. Next task id: `F051`. Closed slices: [docs/archive/](archive/). Product facts: [PROJECT.md](PROJECT.md), [FEATURES.md](FEATURES.md), [CAPABILITY.md](CAPABILITY.md).

## Open gaps (not queued)

- Live agent prompt runs
- Mermaid/draw.io import and hosted sharing
- README/social media recapture from the F043–F048 production commits
- Document-kind conversion preview if an existing file is switched

Do not claim those as shipped.

## How work starts

Add one task in `docs/tasks.json`. A slice is `passing` only after local `verify`, a draft PR, and observed CI on the squash that landed on `main`. Archive it when it is passing so this file and the live queue stay short.
