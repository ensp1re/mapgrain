# Technical debt

| ID | Issue and evidence | Impact or risk | Next action | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| TD-001 | Package build is still `tsc --noEmit` (Node type stripping, `.ts` imports) | Dist emit is untested until a consumer needs compiled JS | Add declaration emit when the editor or CLI imports `@mapgrain/document` from `dist` | F012 | not_started |
| TD-002 | Node 24 Active LTS ends 20 Oct 2026; Node 26 becomes LTS on 28 Oct 2026 | CI pin will age | Re-evaluate engines and `.nvmrc` after 28 Oct 2026 | later | not_started |

## Intake rules

- Include a reproducible symptom and the smallest next action.
- Promote an entry into `tasks.json` when it becomes the active slice.
