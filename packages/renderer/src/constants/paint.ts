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
    raised: `var(--mg-raised, ${tokens.raised})`,
    surface: `var(--mg-surface, ${tokens.surface})`,
    hover: `var(--mg-hover, ${tokens.hover})`,
    border: `var(--mg-border, ${tokens.border})`,
    text: `var(--mg-text, ${tokens.text})`,
    muted: `var(--mg-muted, ${tokens.muted})`,
    accent: `var(--mg-accent, ${tokens.accent})`,
    accentSoft: `var(--mg-accent-soft, ${tokens.accentSoft})`,
    edge: `var(--mg-edge, ${tokens.edge})`,
    group: `var(--mg-group, ${tokens.group})`,
    port: `var(--mg-port, ${tokens.port})`,
    focus: `var(--mg-focus, ${tokens.focus})`,
    danger: `var(--mg-danger, ${tokens.danger})`,
  };
}
