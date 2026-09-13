## What changed

State the resulting behaviour, not the activity. If you found a root cause, name it — that is
usually the most useful sentence in the description.

## Why

What was wrong, or what was missing. Link an issue if there is one.

## Verification

- [ ] `pnpm verify` (lint, typecheck, unit tests, queue validation)
- [ ] `pnpm --filter @mapgrain/editor test:browser` if this touches the editor
- [ ] A test that fails without this change
- [ ] CI green on this revision

## Anything visual

Screenshots for a UI or geometry change. If exported diagrams move, say which fixtures and why
— the scene is shared between the editor and every export, so one usually means the other.
