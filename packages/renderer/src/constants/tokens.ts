import { THEME, type Theme } from "@mapgrain/document";

export interface ThemeTokens {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  edge: string;
  group: string;
  port: string;
}

export const DARK_TOKENS: ThemeTokens = {
  background: "#1c1c1f",
  surface: "#27272a",
  border: "#3f3f46",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  edge: "#71717a",
  group: "#3f3f46",
  port: "#52525b",
};

export const LIGHT_TOKENS: ThemeTokens = {
  background: "#f4f1ea",
  surface: "#fffcf7",
  border: "#d6d3cd",
  text: "#27272a",
  muted: "#71717a",
  edge: "#a1a1aa",
  group: "#d6d3cd",
  port: "#a1a1aa",
};

export function tokensFor(theme: Theme): ThemeTokens {
  return theme === THEME.LIGHT ? LIGHT_TOKENS : DARK_TOKENS;
}
