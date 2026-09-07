# Technical debt

| ID | Issue and evidence | Impact or risk | Next action | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| TD-001 | `pnpm build` is `tsc --noEmit` because there are no product packages yet | CI cannot catch emit/runtime module issues in apps | Replace with per-package emit when F001 adds `packages/document` | F001 | not_started |
| TD-002 | Node 24 Active LTS ends 20 Oct 2026; Node 26 becomes LTS on 28 Oct 2026 | CI pin will age | Re-evaluate engines and `.nvmrc` after 28 Oct 2026 | later | not_started |

## Intake rules

- Include a reproducible symptom and the smallest next action.
- Promote an entry into `tasks.json` when it becomes the active slice.
