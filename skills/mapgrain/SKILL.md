---
name: mapgrain
description: Create and edit Mapgrain architecture or workflow JSON, then validate and export with the mapgrain CLI. Use when the user wants a system map, architecture diagram, workflow diagram, offline HTML, or to refine an existing Mapgrain document.
---

# Mapgrain

Emit semantic diagram JSON. Call the Mapgrain CLI for validation, layout, and export. Do not invent pixel positions.

## Runtime

From a source checkout: `pnpm mapgrain <command>`. From a packed install: `npx mapgrain@0.1.0 <command>`.

```sh
npx mapgrain@0.1.0 validate diagram.json
npx mapgrain@0.1.0 render diagram.json -o diagram.svg
npx mapgrain@0.1.0 view diagram.json -o diagram.html
```

Install this skill:

```sh
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent cursor
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent copilot-codex
npx skills add ensp1re/mapgrain --skill mapgrain --yes -g
```

Project install is the default (omit `-g`). Cursor and Codex first.

## Create

Write a JSON object that matches `packages/cli/schema/document.v1.json`. Field summary: [references/schema.md](references/schema.md). Start from [examples/ten-node.json](examples/ten-node.json).

- `id` values match `^[A-Za-z][A-Za-z0-9_-]*$`.
- Omit `layout` on first create. The editor and CLI layout the graph.
- `revision` starts at `1`.

## Edit

1. Read the file. Record `id` and `revision`.
2. If `revision` is not the recorded base, stop and re-read. Do not patch a changed document.
3. Keep every node, edge, and group `id`.
4. Change labels, kinds, edges, and groups. Copy `layout.positions` unchanged unless the user asked to rearrange.
5. Run `validate`. On failure, apply every diagnostic in one pass. At most three repair attempts. Keep the last valid file.

## Repository maps

Read files. Do not execute the repository, install its dependencies, or run its tests merely to discover architecture.

Evidence `state`:

- `observed` — you read the supporting file
- `asserted` — a human stated it
- `inferred` — you guessed

Put `path:rel/file.ts:line` in `evidence[].note`. Redact credentials. Never copy secrets into the document.

## Export

After a valid document:

```sh
npx mapgrain@0.1.0 view diagram.json -o diagram.html
```

Return the JSON path and the HTML path together.
