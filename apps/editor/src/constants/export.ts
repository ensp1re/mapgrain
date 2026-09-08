import { EXPORT_FORMAT } from "@mapgrain/renderer/vector";

export const EXPORT_CHOICE = {
  SVG: EXPORT_FORMAT.SVG,
  PNG: EXPORT_FORMAT.PNG,
  HTML: EXPORT_FORMAT.HTML,
  JSON: EXPORT_FORMAT.JSON,
} as const;

export const PNG_SCALE_OPTIONS = [
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "3", label: "3×" },
] as const;
