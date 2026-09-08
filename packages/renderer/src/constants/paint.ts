import { THEME, type Theme } from "@mapgrain/document";
import { DARK_TOKENS, LIGHT_TOKENS, type ThemeTokens } from "./tokens.ts";

export const COLOR_MODE = {
  RESOLVED: "resolved",
  THEMED: "themed",
} as const;

export type ColorMode = (typeof COLOR_MODE)[keyof typeof COLOR_MODE];

export function paintsFor(theme: Theme, mode: ColorMode): ThemeTokens {
  const tokens = theme === THEME.LIGHT ? LIGHT_TOKENS : DARK_TOKENS;
  if (mode === COLOR_MODE.RESOLVED) return tokens;
  return {
    background: `var(--mg-bg, ${tokens.background})`,
    surface: `var(--mg-surface, ${tokens.surface})`,
    border: `var(--mg-border, ${tokens.border})`,
    text: `var(--mg-text, ${tokens.text})`,
    muted: `var(--mg-muted, ${tokens.muted})`,
    edge: `var(--mg-edge, ${tokens.edge})`,
    group: `var(--mg-group, ${tokens.group})`,
    port: `var(--mg-port, ${tokens.port})`,
  };
}
