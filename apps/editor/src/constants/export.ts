import { EXPORT_FORMAT } from "@mapgrain/renderer/vector";

export const EXPORT_CHOICE = {
  SVG: EXPORT_FORMAT.SVG,
  PNG: EXPORT_FORMAT.PNG,
  HTML: EXPORT_FORMAT.HTML,
  JSON: EXPORT_FORMAT.JSON,
} as const;
