# Getting started

Mapgrain is a local editor, CLI, and agent skill for architecture, workflow, sequence, data-flow, and lifecycle diagrams. There is no hosted account.

## Editor

From this repository:

```sh
pnpm install
pnpm --filter @mapgrain/editor dev
```

Create a blank diagram, open a JSON file, or pick an example. Arrange runs in a worker. Export writes JSON, SVG, PNG, or offline HTML from the same scene the editor shows.

Studio binds loopback for one opened file:

```sh
npx mapgrain@0.1.0 studio diagram.json
```

## CLI

End users pin the published package:

```sh
npx mapgrain@0.1.0 validate diagram.json
npx mapgrain@0.1.0 layout diagram.json
npx mapgrain@0.1.0 view diagram.json --lang uk -o view.html
npx mapgrain@0.1.0 export diagram.json --format svg -o diagram.svg
npx mapgrain@0.1.0 export diagram.json --format card --view overview -o card.png
npx mapgrain@0.1.0 watch diagram.json --once --format html -o view.html
npx mapgrain@0.1.0 doctor
```

From this checkout, `pnpm mapgrain` is the development command (source CLI `0.2.0`). `npx mapgrain@0.1.0` is the last published package and does not validate sequence, data-flow, or lifecycle fixtures from this checkout. Internals are bundled; do not import `@mapgrain/*` from an application. Do not use an unversioned latest tag.

`diagnose` reports geometry warnings, working-tree snapshot matches, and optional Git verification. `verified` is true only when `evidence.revision` is a 40-character commit SHA and that commit's blob matches `evidence.snapshot`. A matching working-tree hash is `snapshotMatches`, not Git evidence. `diagnose --strict` exits non-zero on overlap or clipping. `compare` reports added, removed, changed, moved, and rerouted facts, and `compare a.json b.json -o review.html` writes a Before/Delta/After review. `watch` keeps last-good output while a file is invalid. JPEG/WebP, clipboard copy, and story WebM are editor exports. Story WebM is 1280×720, cancellable, and recorded in the browser. The CLI raster format is PNG; CLI `--format video` is FFmpeg MP4.

## Skill

```sh
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent cursor
```

Ask the agent for Mapgrain JSON, then validate and open the file. Installer IDs and paths: [agents.md](agents.md). Live prompt runs on a clean agent are still untested; CLI receipts in an empty directory are proven.

## Offline and privacy

The production editor precaches its own assets. API routes and Studio sessions are not cached. Exports do not embed secrets, comments, or selection. Portable HTML has no remote scripts or fonts.

## Troubleshooting

| Symptom | What to try |
| --- | --- |
| `unsupported schemaVersion` | The file is newer than this CLI. Upgrade `npx mapgrain@0.1.0` or export from a matching editor. |
| Studio refuses a write | Another writer changed the file. Reload or save a local JSON copy. |
| Arrange shows a pin conflict | Pins overlap. Move one node or unpin it. |
| PNG export is too large | Lower scale in the export dialog. |
| Skill installed, CLI missing | Install Node 24+ and retry `npx mapgrain@0.1.0 doctor`. |
