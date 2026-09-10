export const PUBLISHED_CLI = "mapgrain@0.2.2";
export const HISTORICAL_CLI = "mapgrain@0.1.0";
export const SOURCE_CLI_VERSION = "0.2.2";
export const SKILLS_CLI_VERSION = "1.5.25";
export const SKILL_SOURCE = "ensp1re/mapgrain";
export const SKILL_NAME = "mapgrain";

export const AGENT_INSTALL = {
  CURSOR: {
    label: "Cursor",
    id: "cursor",
    projectPath: ".agents/skills/mapgrain",
    globalPath: "~/.cursor/skills/mapgrain",
  },
  CODEX: {
    label: "Codex",
    id: "codex",
    projectPath: ".agents/skills/mapgrain",
    globalPath: "~/.codex/skills/mapgrain",
  },
  CLAUDE_CODE: {
    label: "Claude Code",
    id: "claude-code",
    projectPath: ".claude/skills/mapgrain",
    globalPath: "~/.claude/skills/mapgrain",
  },
  OPENCODE: {
    label: "OpenCode",
    id: "opencode",
    projectPath: ".agents/skills/mapgrain",
    globalPath: "~/.config/opencode/skills/mapgrain",
  },
  GITHUB_COPILOT: {
    label: "GitHub Copilot",
    id: "github-copilot",
    projectPath: ".agents/skills/mapgrain",
    globalPath: "~/.copilot/skills/mapgrain",
  },
  GROK: {
    label: "Grok Build",
    id: "grok",
    projectPath: ".grok/skills/mapgrain",
    globalPath: "~/.grok/skills/mapgrain",
  },
  GEMINI_CLI: {
    label: "Gemini CLI",
    id: "gemini-cli",
    projectPath: ".agents/skills/mapgrain",
    globalPath: "~/.gemini/skills/mapgrain",
  },
  WINDSURF: {
    label: "Windsurf",
    id: "windsurf",
    projectPath: ".windsurf/skills/mapgrain",
    globalPath: "~/.codeium/windsurf/skills/mapgrain",
  },
} as const;

export const PRIORITY_AGENTS = Object.values(AGENT_INSTALL);

export const SHARED_PROJECT_SKILL_PATH = ".agents/skills/mapgrain";
