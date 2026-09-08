---
name: mapgrain
description: Create and edit Mapgrain architecture or workflow JSON, then validate, layout, and export with the mapgrain CLI. Use when the user wants a system map, architecture diagram, workflow diagram, offline HTML, or to refine an existing Mapgrain document.
---

# Mapgrain

Emit semantic diagram JSON. Call the Mapgrain CLI for validation, layout, and export. Do not invent pixel positions.

## Runtime

Mapgrain is not published to the npm registry yet. Do not run `npx mapgrain@0.1.0`.

From this repository:

```sh
pnpm mapgrain validate diagram.json
pnpm mapgrain layout diagram.json
pnpm mapgrain view diagram.json -o diagram.html
```

From a packed tarball produced in this repo (`pnpm --filter mapgrain pack` after `pnpm build`):

```sh
npm install ./mapgrain-0.1.0.tgz
npx mapgrain validate diagram.json
npx mapgrain layout diagram.json
npx mapgrain view diagram.json -o diagram.html
```

If `mapgrain` is already on PATH from that install, use that binary. Do not guess a registry version.

## Skill install

Project-local (do not pass `-g` unless the user asks):

```sh
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent cursor
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent codex
```

Copy fallback from this repository:

```sh
mkdir -p .cursor/skills .codex/skills
cp -R skills/mapgrain .cursor/skills/mapgrain
cp -R skills/mapgrain .codex/skills/mapgrain
```

After install, this directory must contain `SKILL.md`, `references/document.schema.json`, and `examples/`.

## Create

Write JSON that matches [references/document.schema.json](references/document.schema.json). Field summary: [references/schema.md](references/schema.md). A branching 10-node example without coordinates: [examples/branching.json](examples/branching.json).

- `id` values match `^[A-Za-z][A-Za-z0-9_-]*$`.
- Omit `layout` on first create.
- Run `mapgrain layout diagram.json` so ELK writes positions. Do not pick x/y yourself.
- `revision` starts at `1`.

## Edit

1. Read the file. Record `id` and `revision`.
2. If `revision` is not the recorded base, stop and re-read. Do not replace a changed file.
3. Keep IDs of every node, edge, and group you retain. Delete only when the user asks.
4. Increment `revision` after a successful edit.
5. Copy `layout.positions` unchanged unless the user asked to rearrange (`mapgrain layout --rearrange`).
6. Write a candidate file, then `validate`. On failure, apply every diagnostic in one pass. At most three repair attempts. Keep the last valid file.

## Repository maps

Read files. Do not execute the repository, install its dependencies, or run its tests merely to discover architecture.

Evidence `state`: `observed` (you read the file), `asserted` (a human stated it), `inferred` (you guessed). Put `path:rel/file.ts:line` in `evidence[].note`. Redact credentials.

## Export

```sh
pnpm mapgrain view diagram.json -o diagram.html
```

Return the JSON path and the HTML path together.
