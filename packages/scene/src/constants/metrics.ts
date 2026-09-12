export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_LINE_HEIGHT = 20;
export const DEFAULT_FONT_WEIGHT = 500;
export const DEFAULT_FONT_FAMILY = "Inter";

export const DEFAULT_NODE_PADDING_X = 18;
export const DEFAULT_NODE_PADDING_Y = 14;

/** The per-codepoint table below under-measures real Inter, which put titles against the
 *  card edge. Widen every measurement rather than padding one caller, so the editor and
 *  every export keep the same geometry. Rounding up also keeps widths integral, which
 *  keeps derived port and group coordinates free of float drift. */
export const MEASURE_SAFETY_SCALE = 1.03;
export const MEASURE_SAFETY_PAD = 2;
export const DEFAULT_MIN_NODE_WIDTH = 72;
export const DEFAULT_MIN_NODE_HEIGHT = 36;
export const DEFAULT_MAX_LABEL_WIDTH = 240;

export const DEFAULT_GROUP_PADDING = 24;
export const DEFAULT_GROUP_HEADER = 22;

export const DEFAULT_SPACING_X = 64;
export const DEFAULT_SPACING_Y = 48;

export const PARALLEL_EDGE_OFFSET = 14;
export const CORNER_RADIUS = 8;
export const EDGE_LABEL_PAD = 4;
export const EDGE_LABEL_CLEARANCE = 36;

export const LATIN_WIDTH = 0.56;
export const SPACE_WIDTH = 0.3;
export const WIDE_WIDTH = 0.95;
export const NARROW_WIDTH = 0.34;
export const BROAD_WIDTH = 0.82;
export const CYRILLIC_WIDTH = 0.6;
export const KIND_LINE_HEIGHT = 14;
export const KIND_FONT_SIZE = 11;
export const KIND_LETTER_SPACING_EM = 0.05;
export const ICON_SIZE = 16;
export const ICON_GAP = 8;
export const KIND_TITLE_GAP = 4;
