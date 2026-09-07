# Reliability and recovery

## Reliability target

Harness state, git history, and recorded verification attempts must survive a failed command, a killed process, and a new session. Product documents will persist in IndexedDB plus a JSON backup once F009 lands. External side effects (push, PR, CI) are reconciled by reading the host, never by assuming success.

## Failure and recovery table

| Failure | Observable signal | Recovery action | Evidence required |
| --- | --- | --- | --- |
| Lint, typecheck, test, or build failure | Non-zero `pnpm verify` | Keep task `active`, fix, rerun `verify ID` | Attempt JSON under `docs/harness/runs/` |
| Interrupted verify | Attempt left `running` | Treat as interrupted; never pass | Attempt file exists; task not `verified` |
| Stale verified task | `validate` reports `evidence is stale` | `transition ID active`, then verify again | New attempt id |
| Dirty worktree on deliver | `deliver --dry-run` lists commit | Commit or restore; do not push mixed work | `git status` |
| Missing GitHub auth or CI | `deliver` exit 1 | Stay `verified`; fix host; retry | gh output, check conclusions |
| Full local storage (later) | Persistence error in the editor | Offer JSON download | User-visible recovery state |
| Stale AI result (later) | Base revision mismatch | Reject or explicit rebase | Document revision |

## State boundaries

Verification writes a `running` attempt before spawning checks. Fingerprints are captured before and after. Input mutation during checks fails the attempt. Locks are PID-checked; a dead owner is replaced, a live owner is not.

Logs under `docs/harness/runs/` are gitignored. Durable summaries live on the task record.

## Verification and observability

Required local check: `pnpm verify`. CI: [.github/workflows/ci.yml](../../.github/workflows/ci.yml). Commands print one JSON object on stdout. Do not store secret values; record variable names and runtime versions only.

## Retention

Keep live tasks in `tasks.json`. Archive only an explicit passing id. Do not prune by age in CI. Cleanup of `*.tmp-*` files is safe to retry.
