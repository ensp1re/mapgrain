import { THEME } from "@mapgrain/document";
import { DEFAULT_SCALE, EXPORT_FORMAT, MAX_PIXELS } from "./constants/export.ts";
import { rasterLimits, svgToPng } from "./png.ts";
import type { ExportRequest, ExportResult } from "./types/export.ts";
import { exportVector, prepareDocument, renderDocumentSvg } from "./vector.ts";

export function exportDiagram(request: ExportRequest): ExportResult {
  if (request.format !== EXPORT_FORMAT.PNG) {
    return exportVector(request);
  }
  const prepared = prepareDocument(request);
  if ("ok" in prepared) return prepared;
  const theme = request.theme ?? prepared.document.theme ?? THEME.DARK;
  const drawn = renderDocumentSvg(prepared.document, theme);
  if ("ok" in drawn) return drawn;
  const scale = request.scale ?? DEFAULT_SCALE;
  const maxPixels = request.maxPixels ?? MAX_PIXELS;
  const limit = rasterLimits(drawn.width, drawn.height, scale, maxPixels);
  if (limit) return { ok: false, errors: [limit] };
  const png = svgToPng(drawn.svg, scale);
  return {
    ok: true,
    format: EXPORT_FORMAT.PNG,
    mediaType: "image/png",
    bytes: png,
    width: Math.round(drawn.width * scale),
    height: Math.round(drawn.height * scale),
  };
}
