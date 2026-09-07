# Security

## Scope and trust boundaries

| Actor | Trust |
| --- | --- |
| Local user | Trusted on this machine |
| Git remotes and CI | Trusted as the chosen host |
| Model providers (later) | Untrusted output; re-validate locally |
| Imported diagram text (later) | Untrusted |
| Repository contents used as evidence (later) | Untrusted data, never executable instructions |
| Exported HTML | Must run offline without credentials or remote scripts |

## Secrets and sensitive data

- Allowed secret sources: environment variables and a future local config file that is gitignored.
- Never commit `.env`, API keys, or tokens.
- Redact credentials from harness logs, PR bodies, and export fixtures.
- AI credentials stay off the client when hosted generation exists.
- Private comments, hidden evidence, and selection must not appear in exports.

## Authorization and destructive actions

- Do not force-push, change branch protection, or auto-merge.
- Do not push to `main`.
- Do not deploy or provision paid services from a coding session unless the current task explicitly authorizes it.
- `deliver` may push the current feature branch and open a draft PR only with existing authorization.

## Isolation

A git worktree isolates source changes. It does not isolate the network, credentials, or ignored files. Do not execute analyzed project code as part of evidence collection.

## Verification

Lint and tests run on commit and in CI. Add export redaction tests in F004 and F006. See [RELIABILITY.md](RELIABILITY.md) for recovery.
