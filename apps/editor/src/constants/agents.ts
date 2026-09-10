export const AGENT_CHOICES = [
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex" },
  { id: "claude-code", label: "Claude Code" },
  { id: "opencode", label: "OpenCode" },
  { id: "github-copilot", label: "GitHub Copilot" },
  { id: "grok", label: "Grok Build" },
  { id: "gemini-cli", label: "Gemini CLI" },
  { id: "windsurf", label: "Windsurf" },
] as const;

export function skillInstallCommand(agentId: string): string {
  return `npx skills add ensp1re/mapgrain --skill mapgrain --yes --agent ${agentId}`;
}
