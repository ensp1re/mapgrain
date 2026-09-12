export const EXPORT_FORMAT = {
  JSON: "json",
  SVG: "svg",
  PNG: "png",
  HTML: "html",
  CARD: "card",
  VIDEO: "video",
} as const;

export const EXPORT_ERROR_CODE = {
  INVALID_DOCUMENT: "invalid_document",
  EMPTY_SELECTION: "empty_selection",
  EXPORT_TOO_LARGE: "export_too_large",
} as const;

export const DEFAULT_SCALE = 1;
export const MAX_SCALE = 4;
export const MAX_PIXELS = 16_777_216;
export const MAX_SIDE = 8192;
export const VIEW_PAD = 24;
export const NODE_RADIUS = 8;
export const GROUP_RADIUS = 8;
/** Height of the tinted strip a lane's label sits inside. */
export const GROUP_HEADER_BAND = 26;
export const PORT_RADIUS = 3;
export const ARROW_SIZE = 8;
