---
name: mapgrain
description: Create and edit Mapgrain architecture, workflow, sequence, data-flow, or lifecycle JSON, then validate, layout, and export with the matching Mapgrain CLI. Use when the user wants a system map, sequence of messages, data flow, lifecycle, offline HTML, or to refine an existing Mapgrain document.
---

# Mapgrain

Emit semantic diagram JSON. Call the Mapgrain CLI for validation, layout, and export. Do not invent pixel positions.

## Runtime (end users)

Published npm CLI: `mapgrain@0.2.4`. Requires Node 24 or newer. That package validates architecture, workflow, sequence, data-flow, and lifecycle documents from this skill. Do not pin an unversioned latest tag and do not overwrite `0.1.0` or `0.2.0`.

`npx mapgrain@0.1.0` is the historical architecture/workflow package. Do not run sequence, data-flow, or lifecycle files through it.

```sh
npx mapgrain@0.2.4 validate diagram.json
npx mapgrain@0.2.4 layout diagram.json
npx mapgrain@0.2.4 view diagram.json -o diagram.html
```

If `mapgrain` is already on PATH from that install, use that binary.

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

Copy fallback when the installer is unavailable. After copy, the skill root is the directory that contains `SKILL.md` (not a source checkout). That directory must contain `SKILL.md`, `references/document.schema.json`, and `examples/`.

```sh
mkdir -p .agents/skills .claude/skills .grok/skills .windsurf/skills
cp -R skills/mapgrain .agents/skills/mapgrain
cp -R skills/mapgrain .claude/skills/mapgrain
cp -R skills/mapgrain .grok/skills/mapgrain
cp -R skills/mapgrain .windsurf/skills/mapgrain
```

## Pick the kind first

The kind decides which node kinds and edge types are legal. Choosing wrong means every node is
rejected, so decide before writing anything.

| The user is describing | `kind` |
| --- | --- |
| what the parts of a system are and what calls what | `architecture` |
| who does what, in what order, with branches | `workflow` |
| messages between parties over time | `sequence` |
| where data comes from, what transforms it, where it rests | `data-flow` |
| the states one thing moves through | `lifecycle` |

Each kind's vocabulary and a worked example: [references/schema.md](references/schema.md).

## Create

Write JSON that matches [references/document.schema.json](references/document.schema.json).
Start from the example of the kind you picked and change it:

| kind | example |
| --- | --- |
| architecture | [examples/branching.json](examples/branching.json) — 10 nodes, no coordinates |
| architecture | [examples/ten-node.json](examples/ten-node.json) — with a portable layout |
| workflow | [examples/workflow.json](examples/workflow.json) — lanes and a labelled decision |
| sequence | [examples/sequence.json](examples/sequence.json) — orders, a reply, a self-message, an `alt` |
| data-flow | [examples/data-flow.json](examples/data-flow.json) — process, store, external entity |
| lifecycle | [examples/lifecycle.json](examples/lifecycle.json) — markers and guarded transitions |

- `id` values match `^[A-Za-z][A-Za-z0-9_-]*$`.
- Omit `layout` on first create.
- Run layout with `npx mapgrain@0.2.4 layout diagram.json` so ELK writes positions. Do not pick x/y yourself.
- `revision` starts at `1`.

## What fails, and what to do about it

These are the mistakes that actually come back from `validate`:

- **Wrong vocabulary for the kind.** A `service` in a `lifecycle`, a `transition` in an
  `architecture`. Check the table in [references/schema.md](references/schema.md); do not
  guess from the name.
- **A decision branch with no label.** Every edge leaving a `decision` needs `outcome` or
  `label`. This is the most common rejection in a workflow.
- **A dangling edge.** `source.nodeId` or `target.nodeId` names a node that is not in `nodes`.
- **A field the schema does not have.** `additionalProperties` is `false` everywhere, so a
  helpful extra key fails the whole document. `shape` on an edge needs `0.2.3` or newer.
- **Mixed message orders.** In a sequence, give `order` to every message or to none.
- **Authored coordinates.** Do not write `layout.positions` yourself. Run `layout`.

On failure, apply every diagnostic in one pass. Three repair attempts at most, then stop and
keep the last valid file rather than guessing further.

## Workflow

1. Write or edit JSON.
2. `npx mapgrain@0.2.4 validate diagram.json`
3. `npx mapgrain@0.2.4 layout diagram.json` (add `--rearrange` only when the user asked to re-layout).
4. `npx mapgrain@0.2.4 view diagram.json -o diagram.html`
5. On validate/layout failure, apply every diagnostic in one pass. At most three repair attempts. Keep the last valid file.

`diagnose diagram.json` reports geometry problems — overlaps, clipping, label clearance — as
JSON warnings. `--strict` turns them into a failure. Run it when a diagram is meant to be read
by someone else.

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

Evidence `state`: `observed` (you read the file), `asserted` (a human stated it), `inferred` (you guessed). Put the source file in `evidence[].path`, optional line in `evidence[].location`, and optional sha256 of the file bytes in `evidence[].snapshot`. Optional `evidence.revision` is a 40-character Git commit SHA. `diagnose` may set `verified` only when that commit's blob matches `snapshot`. A working-tree hash match is `snapshotMatches`, not Git verification. Do not set `revision` to a branch name. Redact credentials.

## Export

```sh
npx mapgrain@0.2.4 view diagram.json -o diagram.html
npx mapgrain@0.2.4 export diagram.json --format svg -o diagram.svg
npx mapgrain@0.2.4 export diagram.json --format png -o diagram.png
```

Return the JSON path and the HTML path together.
