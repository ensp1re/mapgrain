import { THEME, validateDocument, type DiagramDocument } from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import {
  DEFAULT_SCALE,
  EXPORT_ERROR_CODE,
  EXPORT_FORMAT,
  MAX_PIXELS,
} from "./constants/export.ts";
import { tokensFor } from "./constants/tokens.ts";
import { wrapHtml } from "./html.ts";
import { rasterLimits, svgToPng } from "./png.ts";
import { sanitizeDocument, subsetDocument } from "./sanitize.ts";
import { renderSvg } from "./svg/scene.ts";
import type { ExportIssue, ExportRequest, ExportResult } from "./types/export.ts";

const MEDIA: Record<string, string> = {
  [EXPORT_FORMAT.JSON]: "application/json",
  [EXPORT_FORMAT.SVG]: "image/svg+xml",
  [EXPORT_FORMAT.PNG]: "image/png",
  [EXPORT_FORMAT.HTML]: "text/html",
};

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function prepareDocument(
  request: ExportRequest,
): { document: DiagramDocument } | { ok: false; errors: ExportIssue[] } {
  const validated = validateDocument(request.document);
  if (!validated.ok) {
    return {
      ok: false,
      errors: validated.errors.map((error) => ({
        code: EXPORT_ERROR_CODE.INVALID_DOCUMENT,
        message: error.message,
        path: error.path,
      })),
    };
  }
  let document = sanitizeDocument(validated.document, request.includeEvidence === true);
  if (request.nodeIds) {
    if (request.nodeIds.length === 0) {
      return {
        ok: false,
        errors: [
          {
            code: EXPORT_ERROR_CODE.EMPTY_SELECTION,
            message: "Selection is empty.",
            path: "/nodeIds",
          },
        ],
      };
    }
    document = subsetDocument(document, request.nodeIds);
    if (document.nodes.length === 0) {
      return {
        ok: false,
        errors: [
          {
            code: EXPORT_ERROR_CODE.EMPTY_SELECTION,
            message: "None of the selected nodes exist in the document.",
            path: "/nodeIds",
          },
        ],
      };
    }
  }
  return { document };
}

export function exportDiagram(request: ExportRequest): ExportResult {
  const prepared = prepareDocument(request);
  if ("ok" in prepared) return prepared;
  const { document } = prepared;
  const theme = request.theme ?? document.theme ?? THEME.DARK;

  if (request.format === EXPORT_FORMAT.JSON) {
    return {
      ok: true,
      format: EXPORT_FORMAT.JSON,
      mediaType: MEDIA[EXPORT_FORMAT.JSON] ?? "application/json",
      bytes: encodeUtf8(`${JSON.stringify(document, null, 2)}\n`),
    };
  }

  const scene = buildScene(document);
  if (!scene.ok) {
    return {
      ok: false,
      errors: scene.errors.map((error) => ({
        code: EXPORT_ERROR_CODE.INVALID_DOCUMENT,
        message: error.message,
        path: error.path,
      })),
    };
  }

  const { svg, width, height } = renderSvg(scene.scene, theme);

  if (request.format === EXPORT_FORMAT.SVG) {
    return {
      ok: true,
      format: EXPORT_FORMAT.SVG,
      mediaType: MEDIA[EXPORT_FORMAT.SVG] ?? "image/svg+xml",
      bytes: encodeUtf8(`${svg}\n`),
      width,
      height,
    };
  }

  if (request.format === EXPORT_FORMAT.HTML) {
    const html = wrapHtml(document.title, svg, tokensFor(theme).background);
    return {
      ok: true,
      format: EXPORT_FORMAT.HTML,
      mediaType: MEDIA[EXPORT_FORMAT.HTML] ?? "text/html",
      bytes: encodeUtf8(html),
      width,
      height,
    };
  }

  const scale = request.scale ?? DEFAULT_SCALE;
  const maxPixels = request.maxPixels ?? MAX_PIXELS;
  const limit = rasterLimits(width, height, scale, maxPixels);
  if (limit) return { ok: false, errors: [limit] };
  const png = svgToPng(svg, scale);
  return {
    ok: true,
    format: EXPORT_FORMAT.PNG,
    mediaType: MEDIA[EXPORT_FORMAT.PNG] ?? "image/png",
    bytes: png,
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
