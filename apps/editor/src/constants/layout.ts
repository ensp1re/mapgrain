export const BREAKPOINT = {
  PHONE: 390,
  TABLET: 768,
  LAPTOP: 1024,
  DESKTOP: 1280,
  WIDE: 1440,
} as const;

export const PANE_WIDTH = {
  OUTLINE: 240,
  INSPECTOR: 296,
  OUTLINE_WIDE: 240,
  INSPECTOR_WIDE: 300,
  OUTLINE_LAPTOP: 220,
  INSPECTOR_LAPTOP: 280,
} as const;

export const SHELL_LAYOUT = {
  SPLIT: "split",
  SINGLE: "single",
  OVERLAY: "overlay",
} as const;

export type ShellLayout = (typeof SHELL_LAYOUT)[keyof typeof SHELL_LAYOUT];
