import { THEME, type Theme } from "@mapgrain/document";
import { STATE_TONE, type StateTone } from "@mapgrain/scene";
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
    stateStart: `var(--mg-state-start, ${tokens.stateStart})`,
    stateActive: `var(--mg-state-active, ${tokens.stateActive})`,
    stateWait: `var(--mg-state-wait, ${tokens.stateWait})`,
    stateFail: `var(--mg-state-fail, ${tokens.stateFail})`,
    stateDone: `var(--mg-state-done, ${tokens.stateDone})`,
  };
}

export function fillForStateTone(tokens: ThemeTokens, tone: StateTone): string {
  if (tone === STATE_TONE.START) return tokens.stateStart;
  if (tone === STATE_TONE.WAIT) return tokens.stateWait;
  if (tone === STATE_TONE.FAIL) return tokens.stateFail;
  if (tone === STATE_TONE.DONE) return tokens.stateDone;
  return tokens.stateActive;
}
