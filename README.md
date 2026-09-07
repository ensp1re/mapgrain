# Mapgrain

Local-first workspace for technical diagrams.

Describe a system, correct the map by hand, and export something you can actually send. The working name is Mapgrain; a final name is still open.

**This repository is under active development and is not ready for use.** There is no editor, no hosted service, and no supported release yet.

## What it is for

Engineers preparing a design review, explaining a service, or onboarding a teammate. The first useful product is a small architecture or workflow diagram that is easy to create, correct, and export without learning a DSL.

## Status

The repo currently holds the development harness, quality gates, and the queued implementation plan. Product packages are not here yet.

| Area | State |
| --- | --- |
| Document schema and fixtures | queued |
| Editor, layout, exports | queued |
| Agent CLI | queued |
| Hosted sharing and accounts | out of scope for the first release |

## Requirements

- Node.js 24 LTS (CI target). Node 26 current is accepted locally.
- pnpm 10

## Setup

```sh
pnpm install
pnpm verify
```

`pnpm verify` runs ESLint, `tsc`, harness tests, and harness validation.

Current work is tracked with:

```sh
node --experimental-strip-types scripts/cli.ts --root . context
node --experimental-strip-types scripts/cli.ts --root . tasks
```

## License

MIT. See [LICENSE](LICENSE).
