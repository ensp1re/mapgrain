---
name: mapgrain
description: Create and edit Mapgrain architecture or workflow JSON, then validate, layout, and export with the mapgrain CLI. Use when the user wants a system map, architecture diagram, workflow diagram, offline HTML, or to refine an existing Mapgrain document.
---

# Mapgrain

Emit semantic diagram JSON. Call the Mapgrain CLI for validation, layout, and export. Do not invent pixel positions.

## Runtime (end users)

Published CLI: `mapgrain@0.1.0`. Requires Node 24 or newer. Pin the version.

```sh
npx mapgrain@0.1.0 validate diagram.json
npx mapgrain@0.1.0 layout diagram.json
npx mapgrain@0.1.0 view diagram.json -o diagram.html
```

If `mapgrain` is already on PATH from that install, use that binary. Do not guess a newer registry version.

## Repository development

From a Mapgrain checkout only. Do not use these after the skill is installed elsewhere.

```sh
pnpm mapgrain validate diagram.json
pnpm mapgrain layout diagram.json
pnpm mapgrain view diagram.json -o diagram.html
```

## Skill install

Project-local (omit `-g` unless the user asks for a user-wide install). Installer IDs are from `npx skills@1.5.25`. Cursor, Codex, OpenCode, GitHub Copilot, and Gemini CLI share `.agents/skills/mapgrain`.

```sh
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent cursor
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent codex
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent claude-code
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent opencode
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent github-copilot
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent grok
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent gemini-cli
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent windsurf
```

Global (user-wide): add `-g` to the same command.

Update / uninstall:

```sh
npx skills update mapgrain --yes
npx skills remove mapgrain --yes
```

Copy fallback when the installer is unavailable. After copy, this directory must contain `SKILL.md`, `references/document.schema.json`, and `examples/`.

```sh
mkdir -p .agents/skills .claude/skills .grok/skills .windsurf/skills
cp -R skills/mapgrain .agents/skills/mapgrain
cp -R skills/mapgrain .claude/skills/mapgrain
cp -R skills/mapgrain .grok/skills/mapgrain
cp -R skills/mapgrain .windsurf/skills/mapgrain
```

## Create

Write JSON that matches [references/document.schema.json](references/document.schema.json). Field summary: [references/schema.md](references/schema.md). A branching 8–12 node example without coordinates: [examples/branching.json](examples/branching.json). A 10-node example with portable layout: [examples/ten-node.json](examples/ten-node.json).

- `id` values match `^[A-Za-z][A-Za-z0-9_-]*$`.
- Omit `layout` on first create.
- Run `npx mapgrain@0.1.0 layout diagram.json` so ELK writes positions. Do not pick x/y yourself.
- `revision` starts at `1`.

## Workflow

1. Write or edit JSON.
2. `npx mapgrain@0.1.0 validate diagram.json`
3. `npx mapgrain@0.1.0 layout diagram.json` (add `--rearrange` only when the user asked to re-layout).
4. `npx mapgrain@0.1.0 view diagram.json -o diagram.html`
5. On validate/layout failure, apply every diagnostic in one pass. At most three repair attempts. Keep the last valid file.

## Edit

1. Read the file. Record `id` and `revision`.
2. If `revision` is not the recorded base, stop and re-read. Do not replace a changed file.
3. Keep IDs of every node, edge, and group you retain. Delete only when the user asks.
4. Increment `revision` after a successful edit.
5. Copy `layout.positions` unchanged unless the user asked to rearrange.
6. Write a candidate file, then `validate`.

One writer per artifact. If two agents may touch the same file, use `revision` / conflicts: the second writer re-reads after a conflict. There is no built-in coordinator.

## Repository maps

Read files. Do not execute the repository, install its dependencies, or run its tests merely to discover architecture.

Evidence `state`: `observed` (you read the file), `asserted` (a human stated it), `inferred` (you guessed). Put `path:rel/file.ts:line` in `evidence[].note`. Redact credentials.

## Export

```sh
npx mapgrain@0.1.0 view diagram.json -o diagram.html
npx mapgrain@0.1.0 export diagram.json --format svg -o diagram.svg
npx mapgrain@0.1.0 export diagram.json --format png -o diagram.png
```

Return the JSON path and the HTML path together.
