# Mapgrain working contract

Mapgrain is a local-first technical diagram workspace. This file is the router: how work starts, how a change is verified, and where current state lives. Read only the linked document needed for the current task.

## Start here

1. Run `node --experimental-strip-types scripts/harness/cli.ts --root . context` from the repository root. Use its JSON output for the active task, ready IDs, blockers, evidence freshness, and next action.
2. Trust the reported git branch, revision, and dirty flag. Do not invent them.
3. Read the active task, then [the plan](docs/harness/PLAN.md) and [handoff](docs/harness/SESSION_HANDOFF.md) when those paths are present.
4. Read [the product spec](docs/harness/PROJECT.md) and [architecture](docs/harness/ARCHITECTURE.md) before changing specced behavior or package boundaries.
5. Run `pnpm install` when dependencies or the lockfile changed.

## Working rules

- One task at a time. Keep unrelated cleanup out of the slice.
- State the intended change and affected packages before editing.
- Prefer a smaller, boring implementation that meets the acceptance criteria.
- Put named types and domain unions in `types/` modules, and runtime domain literals in `constants/` modules, inside the owning package.
- Do not put the whole feature in one file. Do not add comments that restate the code.
- Branch from `main` as `<type>/<short-kebab-topic>`. Never push product work to `main`.
- Keep secrets out of source, logs, plans, handoffs, and pull requests.
- Do not claim a deferred feature is shipped. Do not invent AI output.

## Lifecycle

Use `not_started → active → verified → passing`. Use `blocked` when an external condition stops progress. A failed check returns the task to `active`. Stale `verified` work must be reactivated and verified again.

Before `verified`, run `pnpm verify` through `node --experimental-strip-types scripts/harness/cli.ts --root . verify ID` so evidence is recorded. Running `pnpm verify` by itself does not update the queue.

## Delivery

Push and PR only with authorization already given for the current task. Default path:

1. Implement on a feature branch.
2. Verify locally and record the attempt.
3. Commit with a conventional message that names the resulting behavior.
4. Open a **draft** GitHub pull request against `main`. Keep the description short. Include the commands that ran.
5. Wait for [CI](.github/workflows/ci.yml). Fix on the branch.
6. Record the PR URL and revision with `node --experimental-strip-types scripts/harness/cli.ts --root . deliver ID`.

## Harness commands

```sh
node --experimental-strip-types scripts/harness/cli.ts --root . context
node --experimental-strip-types scripts/harness/cli.ts --root . tasks
node --experimental-strip-types scripts/harness/cli.ts --root . validate
node --experimental-strip-types scripts/harness/cli.ts --root . transition ID active
node --experimental-strip-types scripts/harness/cli.ts --root . verify ID
node --experimental-strip-types scripts/harness/cli.ts --root . handoff
node --experimental-strip-types scripts/harness/cli.ts --root . deliver ID --dry-run
node --experimental-strip-types scripts/harness/cli.ts --root . archive ID --dry-run
```

`pnpm --silent harness --root . context` is the same runner if you prefer the package script.

Queue: [docs/harness/tasks.json](docs/harness/tasks.json). Reliability: [docs/harness/RELIABILITY.md](docs/harness/RELIABILITY.md). Security: [docs/harness/SECURITY.md](docs/harness/SECURITY.md).
