# Mapgrain

**Technical diagrams that live in your repository.** Architecture, workflow, sequence,
data-flow and lifecycle diagrams as JSON you can read in a diff, edit by hand or through an
agent, and send to anyone as a single offline HTML file.

No account. No server. The editor, the CLI and the exports all run on your machine.

[![CI](https://github.com/ensp1re/mapgrain/actions/workflows/ci.yml/badge.svg)](https://github.com/ensp1re/mapgrain/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mapgrain)](https://www.npmjs.com/package/mapgrain)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

![Invoice capture lane in the Mapgrain editor, dark theme](docs/media/hero-dark.png)

<sub>Light theme: [hero-light.png](docs/media/hero-light.png) · how these were captured:
[docs/media/capture.json](docs/media/capture.json)</sub>

## 60 seconds

```sh
npx mapgrain@0.2.3 validate diagram.json    # is it a real document?
npx mapgrain@0.2.3 layout diagram.json      # ELK writes the coordinates
npx mapgrain@0.2.3 view diagram.json -o diagram.html
```

`diagram.html` opens with no server and no network: search, pan, zoom, follow a path, switch
theme. Send it as a file.

To edit by hand instead, run the editor from a checkout:

```sh
pnpm install
pnpm --filter @mapgrain/editor dev
```

Pick a template, or start blank. Rename with `Enter`, connect two cards, drag an endpoint onto
a different card, choose a line shape, arrange with ELK, walk through it step by step, or run a
workflow by firing its transitions.

![Editing: rename, connect, pin, arrange, undo](docs/media/editing.gif)

## Five kinds of diagram

Each kind has its own vocabulary, its own validation, and its own layout.

| Kind | For | Nodes | Connections |
| --- | --- | --- | --- |
| `architecture` | what the parts are and what calls what | service, datastore, queue, gateway, actor, system, job, external | calls, reads, writes, publishes, subscribes, depends-on |
| `workflow` | who does what, in what order, with branches | actor, job, decision, system, gateway | calls, outcome |
| `sequence` | messages between parties over time | participant, actor | message, reply |
| `data-flow` | where data comes from and where it rests | process, datastore, entity, external | data, reads, writes |
| `lifecycle` | the states one thing moves through | state | transition |

A worked example of each ships with the agent skill:
[workflow](skills/mapgrain/examples/workflow.json),
[sequence](skills/mapgrain/examples/sequence.json),
[data-flow](skills/mapgrain/examples/data-flow.json),
[lifecycle](skills/mapgrain/examples/lifecycle.json),
[architecture](skills/mapgrain/examples/branching.json). Every one validates, lays out and
exports — that is a test, not a claim.

## The portable view

An export is one HTML file with the diagram drawn as vectors — not a screenshot, and not a
bundle of the editor. Search, fit, reach, route, named views, stories, role lenses, English and
Ukrainian chrome.

![Portable viewer: search, theme, pan](docs/media/viewer.gif)

At 390px the canvas is still the main surface:

![Editor at 390px](docs/media/narrow-390.png)

## The CLI

```sh
npx mapgrain@0.2.3 <command> diagram.json
```

| Command | Does |
| --- | --- |
| `validate` | checks the document against the schema and the kind's own rules |
| `layout` | runs ELK and writes `layout.positions`; `--rearrange` to start over |
| `view` | writes the offline HTML viewer |
| `export` | `--format svg \| png \| json` |
| `diagnose` | geometry warnings as JSON; `--strict` to fail on them |
| `compare` | what changed between two revisions, optionally as Before/Delta/After HTML |
| `watch` | re-reads a file as an agent writes it, keeping the last valid version |
| `studio` | serves one opened file on loopback for a local editor session |
| `doctor` | reports runtime, assets, worker, renderer and output |

![CLI validate and layout receipts](docs/media/cli-workflow.gif)

Those frames are CLI receipts, not a live agent prompt: install paths are tested, live prompt
runs are not.

## For agents

Mapgrain ships a skill so an agent writes the JSON and the CLI checks it, instead of the agent
guessing pixel coordinates.

```sh
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent claude-code
```

Cursor, Codex, OpenCode, GitHub Copilot, Gemini CLI, Grok and Windsurf are covered too — the
matrix is in [docs/agents.md](docs/agents.md), and the skill itself is
[skills/mapgrain/SKILL.md](skills/mapgrain/SKILL.md).

## What is shipped, and what is not

[docs/FEATURES.md](docs/FEATURES.md) has the full table with status per row. Not shipped:
hosted sharing, Mermaid and draw.io import, and live agent prompt runs. Historical
`npx mapgrain@0.1.0` still rejects sequence, data-flow and lifecycle documents.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers setup, the
checks, and what a good pull request looks like; [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
covers conduct; [SECURITY.md](SECURITY.md) covers reporting a vulnerability.

```sh
pnpm install
pnpm verify        # lint, typecheck, unit tests, queue validation
```

Node 24 LTS in CI, Node 26 accepted locally. pnpm 10 for this repository — end users only need
`npx`. Longer walkthrough: [docs/getting-started.md](docs/getting-started.md). Package layout
and invariants: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

MIT. See [LICENSE](LICENSE).
