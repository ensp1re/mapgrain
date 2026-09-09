# Mapgrain

A local workspace for architecture, workflow, sequence, data-flow, and lifecycle diagrams you can edit by hand, generate through an agent, and send as offline HTML.

![Invoice capture lane in the Mapgrain editor, dark theme](docs/media/hero-dark.png)

Light theme: [hero-light.png](docs/media/hero-light.png). Capture notes: [docs/media/capture.json](docs/media/capture.json).

## Try it

Edit a label, connect two nodes, pin one, preview Arrange, then undo:

![Editing: rename, connect, pin, arrange, undo](docs/media/editing.gif)

Open exported HTML without a server. Search, change theme, pan:

![Portable viewer: search, theme, pan](docs/media/viewer.gif)

At 390px the canvas stays the main surface:

![Editor at 390px](docs/media/narrow-390.png)

## CLI and skill

Architecture and workflow on the last published package:

```sh
npx mapgrain@0.1.0 validate diagram.json
npx mapgrain@0.1.0 layout diagram.json
npx mapgrain@0.1.0 view diagram.json -o view.html
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent cursor
```

All five modes with a matching packed `0.2.0` tarball (not on npm yet):

```sh
pnpm --filter mapgrain pack --pack-destination /tmp/mapgrain-dist
npm install --omit=dev /tmp/mapgrain-dist/mapgrain-0.2.0.tgz
npx mapgrain validate tests/fixtures/documents/sequence-checkout.json
npx mapgrain view tests/fixtures/documents/sequence-checkout.json -o sequence.html
```

![CLI validate and layout receipts](docs/media/cli-workflow.gif)

Those frames are CLI receipts, not a live agent prompt. Install paths are tested; live prompt runs are not. Matrix: [docs/agents.md](docs/agents.md). Walkthrough: [docs/getting-started.md](docs/getting-started.md).

## What is shipped

See [docs/FEATURES.md](docs/FEATURES.md) for shipped, partial, planned, and deferred rows. Short version:

- Architecture, workflow, sequence, data-flow, and lifecycle documents with mode-specific validation
- Editor: direct edit, arrange preview, save, export, offline production bundle
- Portable HTML: search, fit, reach, route, named views, stories, role lenses, en/uk chrome
- CLI: validate, layout, view, export, diagnose, compare, watch, doctor, studio
- Presets, share-card PNG, and story video from the first authored story

Not shipped: hosted sharing, Mermaid/draw.io import, and live agent prompt runs. Sequence alt/opt fragments are modeled in this checkout; npm `mapgrain@0.1.0` does not validate them.

## Examples

| File | Kind |
| --- | --- |
| [tests/fixtures/documents/nested-groups.json](tests/fixtures/documents/nested-groups.json) | Architecture with nested groups |
| [tests/fixtures/documents/workflow-decision.json](tests/fixtures/documents/workflow-decision.json) | Workflow decision with labelled outcomes |
| [skills/mapgrain/examples/ten-node.json](skills/mapgrain/examples/ten-node.json) | 10-node invoice lane used in the hero still |

Each file validates, lays out, and exports JSON/SVG/PNG/HTML.

## Requirements

- Node.js 24 LTS (CI). Node 26 is accepted locally.
- pnpm 10 for this repository. End users only need `npx`.

```sh
pnpm install
pnpm verify
```

Development CLI: `pnpm mapgrain` (source `0.2.0`). Last published package: `mapgrain@0.1.0`, which does not validate sequence, data-flow, or lifecycle fixtures from this checkout. The matching five-mode CLI is the packed `mapgrain-0.2.0.tgz` tarball. Internals are bundled. Do not use `npx mapgrain@latest`. Do not overwrite `0.1.0`.

## License

MIT. See [LICENSE](LICENSE).
