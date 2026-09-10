# Agent skill install matrix

Source of installer IDs and paths: `npx skills@1.5.25` (2026-09-08). Do not invent agent IDs. Further targets exist in that CLI; this table covers the usable-release priority set. Installation success is not a live task pass.

Host for this matrix: macOS, Node 24+. CLI prerequisite: Node `>=24 <27` and `npx mapgrain@0.2.2`. Historical `npx mapgrain@0.1.0` still validates architecture/workflow only.

Project install (default):

```sh
npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent <id>
```

Global install: add `-g`. Update: `npx skills update mapgrain --yes`. Remove: `npx skills remove mapgrain --yes`.

Cursor, Codex, OpenCode, GitHub Copilot, and Gemini CLI share the project path `.agents/skills/mapgrain`.

| Agent | Installer ID | Project path | Global path | Install test | Live task | Last tested | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cursor | `cursor` | `.agents/skills/mapgrain` | `~/.cursor/skills/mapgrain` | pass (copy via `skills add`) | untested | 2026-09-08 | Agent binary present; no clean-directory live prompt run |
| Codex | `codex` | `.agents/skills/mapgrain` | `~/.codex/skills/mapgrain` | pass (shared project path) | untested | 2026-09-08 | Agent binary present; no clean-directory live prompt run |
| Claude Code | `claude-code` | `.claude/skills/mapgrain` | `~/.claude/skills/mapgrain` | pass | untested | 2026-09-08 | Agent binary present; no clean-directory live prompt run |
| OpenCode | `opencode` | `.agents/skills/mapgrain` | `~/.config/opencode/skills/mapgrain` | pass (shared project path) | untested | 2026-09-08 | Agent binary present; no clean-directory live prompt run |
| GitHub Copilot | `github-copilot` | `.agents/skills/mapgrain` | `~/.copilot/skills/mapgrain` | pass (shared project path) | untested | 2026-09-08 | `copilot` CLI not installed here |
| Grok Build | `grok` | `.grok/skills/mapgrain` | `~/.grok/skills/mapgrain` | pass | untested | 2026-09-08 | Agent binary present; no isolated live prompt run recorded |
| Gemini CLI | `gemini-cli` | `.agents/skills/mapgrain` | `~/.gemini/skills/mapgrain` | pass (shared project path) | untested | 2026-09-08 | `gemini` CLI not installed here |
| Windsurf | `windsurf` | `.windsurf/skills/mapgrain` | `~/.codeium/windsurf/skills/mapgrain` | pass | untested | 2026-09-08 | `windsurf` CLI not installed here |

Live-task rows stay untested until a clean-directory agent run records: text→8–12-node architecture, repository-grounded diagram, ID/position-preserving edit, invalid-input repair, and readable export. CLI-only equivalents pass via `npx mapgrain@0.2.2` in an empty directory. Do not send sequence, data-flow, or lifecycle fixtures to `npx mapgrain@0.1.0`.

Two writers: assign one writer per file, or require a re-read after a `revision` conflict. Mapgrain does not ship a coordinator. Concurrent CLI writers on one file conflict or no-clobber; they do not merge.
