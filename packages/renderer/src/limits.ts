import { EXPORT_ERROR_CODE, MAX_SCALE, MAX_SIDE } from "./constants/export.ts";
import type { ExportIssue } from "./types/export.ts";

export function rasterLimits(
  width: number,
  height: number,
  scale: number,
  maxPixels: number,
): ExportIssue | null {
  if (scale > MAX_SCALE) {
    return {
      code: EXPORT_ERROR_CODE.EXPORT_TOO_LARGE,
      message: `scale ${scale} exceeds the maximum of ${MAX_SCALE}`,
      path: "/scale",
      suggestedScale: MAX_SCALE,
      maxPixels,
    };
  }
  const outWidth = width * scale;
  const outHeight = height * scale;
  const pixels = outWidth * outHeight;
  if (outWidth > MAX_SIDE || outHeight > MAX_SIDE || pixels > maxPixels) {
    const bySide = Math.min(MAX_SIDE / width, MAX_SIDE / height);
    const byPixels = Math.sqrt(maxPixels / (width * height));
    const suggestedScale = Math.max(0.25, Math.floor(Math.min(MAX_SCALE, bySide, byPixels) * 100) / 100);
    return {
      code: EXPORT_ERROR_CODE.EXPORT_TOO_LARGE,
      message: `PNG would be ${Math.ceil(outWidth)}×${Math.ceil(outHeight)} (${Math.ceil(pixels)} pixels). Try scale ${suggestedScale} or a smaller selection.`,
      path: "/scale",
      suggestedScale,
      maxPixels,
    };
  }
  return null;
}
