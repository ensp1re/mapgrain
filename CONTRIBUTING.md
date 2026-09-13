# Contributing to Mapgrain

Thanks for looking. Issues and pull requests are both welcome, including small ones.

## Setup

```sh
pnpm install
pnpm verify
```

Node 24 LTS is what CI runs; Node 26 works locally. pnpm 10 for this repository — people who
only *use* Mapgrain need nothing but `npx`.

Run the editor:

```sh
pnpm --filter @mapgrain/editor dev
```

Run the CLI from source, without publishing anything:

```sh
pnpm mapgrain validate tests/fixtures/documents/nested-groups.json
```

## The checks

| Command | What it covers |
| --- | --- |
| `pnpm lint` | ESLint, zero warnings allowed |
| `pnpm typecheck` | every package, no emit |
| `pnpm test` | unit tests across `tests/`, `packages/*/tests/`, `apps/*/tests/` |
| `pnpm verify` | all three, plus the work-queue validation |
| `pnpm --filter @mapgrain/editor test:browser` | Playwright against the production build |

Browser tests need a build first:

```sh
pnpm --filter @mapgrain/editor build
pnpm --filter @mapgrain/editor test:browser
```

A commit hook runs lint-staged and `pnpm verify`, so a broken commit is hard to make by
accident.

## How the packages fit together

```
packages/document   schema, types, operations — the source of truth
packages/scene      text metrics, geometry, routing — one scene for the editor and every export
packages/layout     ELK in a worker
packages/renderer   deterministic SVG, PNG, HTML
packages/viewer     the small read-only bundle an export ships
packages/cli        the published `mapgrain` command
apps/editor         the local editor
```

Dependencies point one way: `document → scene → layout/renderer → editor/cli`. Two invariants
are worth knowing before you change geometry:

- **The scene is identical for the editor and for every export.** If a shape looks one way on
  the canvas and another in the SVG, that is a bug, not a styling choice.
- **Operations are validated against a base revision and each has an inverse**, which is what
  makes undo work and what stops an agent clobbering a newer manual edit.

More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Writing the change

- Branch from `main` as `<type>/<short-kebab-topic>`.
- Conventional commit messages — `feat:`, `fix:`, `docs:`, `chore:`, `test:`. commitlint
  enforces the prefix.
- Put named types in `types/` and runtime literals in `constants/`, inside the package that
  owns them.
- Prefer the smaller, more boring implementation.
- Do not add a comment that restates the code. Do add one that says *why*, especially where the
  obvious thing was wrong.

## What a good pull request looks like

- One behaviour, stated in the title as the result, not the activity.
- A description that says what was wrong, not only what changed. If you found a root cause,
  name it.
- A test that fails without the change. For geometry, that usually means a case in
  `packages/scene/tests`; for the editor, a browser test.
- Green CI. If a check is flaky, say so rather than re-running until it passes.

Screenshots help for anything visual. If a diagram's geometry changes, say which fixtures moved
and why.

## Reporting a bug

Open an issue with the document that reproduces it — a Mapgrain diagram is a JSON file, so
pasting it is usually the whole report. Say which command or which part of the editor, and what
you expected instead.

Security issues go through [SECURITY.md](SECURITY.md), not the issue tracker.
