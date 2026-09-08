import { THEME, validateDocument, type DiagramDocument, type Theme } from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { EXPORT_ERROR_CODE, EXPORT_FORMAT } from "./constants/export.ts";
import { COLOR_MODE, type ColorMode } from "./constants/paint.ts";
import { tokensFor } from "./constants/tokens.ts";
import { wrapHtml } from "./html.ts";
import { sanitizeDocument, subsetDocument } from "./sanitize.ts";
import { renderSvg } from "./svg/scene.ts";
import type { ExportIssue, ExportRequest, ExportResult } from "./types/export.ts";

export {
  DEFAULT_SCALE,
  EXPORT_ERROR_CODE,
  EXPORT_FORMAT,
  MAX_PIXELS,
  MAX_SCALE,
} from "./constants/export.ts";
export { COLOR_MODE } from "./constants/paint.ts";
export { rasterLimits } from "./limits.ts";

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function prepareDocument(
  request: Pick<ExportRequest, "document" | "nodeIds" | "includeEvidence">,
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

export function renderDocumentSvg(
  document: DiagramDocument,
  theme: Theme,
  colorMode: ColorMode = COLOR_MODE.RESOLVED,
): { svg: string; width: number; height: number } | { ok: false; errors: ExportIssue[] } {
  const scene = buildScene(document, { positions: document.layout?.positions ?? {} });
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
  return renderSvg(scene.scene, theme, colorMode);
}

export function exportVector(request: ExportRequest): ExportResult {
  const prepared = prepareDocument(request);
  if ("ok" in prepared) return prepared;
  const { document } = prepared;
  const theme = request.theme ?? document.theme ?? THEME.DARK;
  const colorMode = request.colorMode ?? COLOR_MODE.RESOLVED;

  if (request.format === EXPORT_FORMAT.JSON) {
    return {
      ok: true,
      format: EXPORT_FORMAT.JSON,
      mediaType: "application/json",
      bytes: encodeUtf8(`${JSON.stringify(document, null, 2)}\n`),
    };
  }

  const drawn = renderDocumentSvg(document, theme, colorMode);
  if ("ok" in drawn) return drawn;
  const { svg, width, height } = drawn;

  if (request.format === EXPORT_FORMAT.HTML) {
    return {
      ok: true,
      format: EXPORT_FORMAT.HTML,
      mediaType: "text/html",
      bytes: encodeUtf8(wrapHtml(document.title, svg, tokensFor(theme).background)),
      width,
      height,
    };
  }

  return {
    ok: true,
    format: EXPORT_FORMAT.SVG,
    mediaType: "image/svg+xml",
    bytes: encodeUtf8(`${svg}\n`),
    width,
    height,
  };
}
