# Delivery plan

Mapgrain is a local editor, CLI (`npx mapgrain@0.1.0` for architecture/workflow; packed `0.2.0` tarball for all five modes), and agent skill. Users make a diagram by hand or through an agent, save JSON, and export SVG/PNG/HTML. No account.

**Status:** F048 active. Next task id after this slice: `F049`. Closed slices: [docs/archive/](archive/). Product facts: [PROJECT.md](PROJECT.md), [FEATURES.md](FEATURES.md), [CAPABILITY.md](CAPABILITY.md).

## Live slice

**F048 — matching 0.2.0 tarball.** V4 first gate: advertised sequence/data-flow/lifecycle fixtures must validate and render with a packed CLI outside the monorepo. Do not publish npm. Do not pin `latest`.

## Open gaps (not this slice)

- Publishing `mapgrain@0.2.0` to npm (separate grant)
- Live agent prompt runs
- Mermaid/draw.io import and hosted sharing
- Five-user study / physical-device smoke
- README/social media recapture from the F043–F047 production commits
- Document-kind conversion preview if an existing file is switched

Do not claim those as shipped.

## How work starts

Add one task in `docs/tasks.json`. A slice is `passing` only after local `verify`, a draft PR, and observed CI on the squash that landed on `main`. Archive it when it is passing so this file and the live queue stay short.
