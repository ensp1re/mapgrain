export const BREAKPOINT = {
  PHONE: 390,
  TABLET: 768,
  LAPTOP: 1024,
  DESKTOP: 1280,
  WIDE: 1440,
} as const;

/** Defaults in px. These mirror --outline-w / --inspector-w in styles/tokens.css. */
export const PANE_WIDTH = {
  OUTLINE: 264,
  INSPECTOR: 300,
  OUTLINE_LAPTOP: 220,
  INSPECTOR_LAPTOP: 280,
} as const;

export const PANE_WIDTH_MIN = 200;
export const PANE_WIDTH_MAX = 420;
export const PANE_WIDTH_STEP = 16;

export const SHELL_LAYOUT = {
  SPLIT: "split",
  SINGLE: "single",
  OVERLAY: "overlay",
} as const;

export type ShellLayout = (typeof SHELL_LAYOUT)[keyof typeof SHELL_LAYOUT];
