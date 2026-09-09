import { THEME, type Theme } from "@mapgrain/document";
import { kindFillCssVars } from "./kindFill.ts";

export interface ThemeTokens {
  background: string;
  raised: string;
  surface: string;
  hover: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  edge: string;
  group: string;
  port: string;
  focus: string;
  danger: string;
  stateStart: string;
  stateActive: string;
  stateWait: string;
  stateFail: string;
  stateDone: string;
}

export const DARK_TOKENS: ThemeTokens = {
  background: "#1c1c1f",
  raised: "#222226",
  surface: "#27272a",
  hover: "#2e2e33",
  border: "#3f3f46",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  accent: "#6d72f3",
  accentSoft: "rgba(109, 114, 243, 0.16)",
  edge: "#71717a",
  group: "#3f3f46",
  port: "#52525b",
  focus: "#9aa0ff",
  danger: "#f87171",
  stateStart: "#243d38",
  stateActive: "#27352c",
  stateWait: "#3a3426",
  stateFail: "#3c272b",
  stateDone: "#2c2a3d",
};

export const LIGHT_TOKENS: ThemeTokens = {
  background: "#f4f1ea",
  raised: "#faf7f1",
  surface: "#fffcf7",
  hover: "#f3efe7",
  border: "#d6d3cd",
  text: "#27272a",
  muted: "#71717a",
  accent: "#4f46e5",
  accentSoft: "rgba(79, 70, 229, 0.1)",
  edge: "#a1a1aa",
  group: "#d6d3cd",
  port: "#a1a1aa",
  focus: "#4f46e5",
  danger: "#b91c1c",
  stateStart: "#dceae6",
  stateActive: "#e3eee4",
  stateWait: "#f3ead6",
  stateFail: "#f3e0e2",
  stateDone: "#e6e4f2",
};

export function tokensFor(theme: Theme): ThemeTokens {
  return theme === THEME.LIGHT ? LIGHT_TOKENS : DARK_TOKENS;
}

export function tokenCssVars(tokens: ThemeTokens, prefix = "--mg-"): string {
  return [
    `${prefix}bg: ${tokens.background}`,
    `${prefix}raised: ${tokens.raised}`,
    `${prefix}surface: ${tokens.surface}`,
    `${prefix}hover: ${tokens.hover}`,
    `${prefix}border: ${tokens.border}`,
    `${prefix}text: ${tokens.text}`,
    `${prefix}muted: ${tokens.muted}`,
    `${prefix}accent: ${tokens.accent}`,
    `${prefix}accent-soft: ${tokens.accentSoft}`,
    `${prefix}edge: ${tokens.edge}`,
    `${prefix}group: ${tokens.group}`,
    `${prefix}port: ${tokens.port}`,
    `${prefix}focus: ${tokens.focus}`,
    `${prefix}danger: ${tokens.danger}`,
    `${prefix}state-start: ${tokens.stateStart}`,
    `${prefix}state-active: ${tokens.stateActive}`,
    `${prefix}state-wait: ${tokens.stateWait}`,
    `${prefix}state-fail: ${tokens.stateFail}`,
    `${prefix}state-done: ${tokens.stateDone}`,
  ].join("; ");
}

export function viewerChromeCss(): string {
  const dark = `${tokenCssVars(DARK_TOKENS)}; ${kindFillCssVars(THEME.DARK)}`;
  const light = `${tokenCssVars(LIGHT_TOKENS)}; ${kindFillCssVars(THEME.LIGHT)}`;
  return `
    :root { color-scheme: dark; --bg: ${DARK_TOKENS.background}; --fg: ${DARK_TOKENS.text}; --muted: ${DARK_TOKENS.muted}; --accent: ${DARK_TOKENS.accent}; ${dark}; }
    html[data-theme="light"] { color-scheme: light; --bg: ${LIGHT_TOKENS.background}; --fg: ${LIGHT_TOKENS.text}; --muted: ${LIGHT_TOKENS.muted}; --accent: ${LIGHT_TOKENS.accent}; ${light}; }
    html, body { margin: 0; background: var(--mg-bg); color: var(--mg-text); font-family: Inter, ui-sans-serif, system-ui, sans-serif; height: 100%; }
    .mapgrain-viewer { display: flex; flex-direction: column; height: 100%; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--mg-border); background: var(--mg-raised); }
    .view-title { font-weight: 600; letter-spacing: -0.02em; }
    .toolbar input, .toolbar select, .toolbar button { font: inherit; background: var(--mg-surface); color: var(--mg-text); border: 1px solid var(--mg-border); border-radius: 8px; padding: 7px 12px; }
    .toolbar input { flex: 1; min-width: 120px; }
    .toolbar button:hover, .toolbar select:hover { background: var(--mg-hover); }
    .toolbar button:focus-visible, .toolbar input:focus-visible, .toolbar select:focus-visible { outline: 2px solid var(--mg-accent); outline-offset: 2px; }
    .viewport-bar { display: flex; align-items: center; border: 1px solid var(--mg-border); border-radius: 8px; background: var(--mg-raised); overflow: hidden; }
    .viewport-bar button { border: 0; border-radius: 0; background: transparent; min-width: 34px; padding: 7px 8px; }
    .viewport-bar span { font-size: 12px; padding: 0 8px; color: var(--mg-muted); font-variant-numeric: tabular-nums; }
    .toolbar-advanced { display: none; flex-basis: 100%; flex-wrap: wrap; gap: 8px; align-items: center; padding-top: 4px; }
    .toolbar-advanced.is-open { display: flex; }
    .search-hits { list-style: none; margin: 0; padding: 0 12px; display: none; }
    .search-hits.is-open { display: block; }
    .search-hits button { display: block; width: 100%; text-align: left; }
    .stage { overflow: hidden; flex: 1; min-height: 0; cursor: grab; background: var(--mg-bg); }
    .stage.is-panning { cursor: grabbing; }
    .board { transform-origin: 0 0; }
    svg { display: block; }
    .is-match rect { stroke: var(--mg-accent); stroke-width: 2; }
    .is-dim { opacity: 0.28; }
    .help { display: none; padding: 12px; color: var(--mg-muted); }
    .help.is-open { display: block; }
    .status { margin: 0; padding: 8px 12px; color: var(--mg-muted); min-height: 1.4em; }
    @media (max-width: 390px) {
      .toolbar { padding: 8px 10px; }
      .toolbar .wide { display: none; }
      .view-title { font-size: 12px; }
    }
  `;
}
