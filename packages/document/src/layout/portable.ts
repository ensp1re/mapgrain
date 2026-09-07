import { LAYOUT_SECTION_VERSION } from "../constants/document.ts";
import type { DiagramDocument, LayoutPoint } from "../types/document.ts";
import { validateDocument } from "../validate.ts";

export function portablePositions(document: DiagramDocument): Record<string, LayoutPoint> {
  return document.layout?.positions ?? {};
}

export function applyPortableLayout(
  document: DiagramDocument,
  positions: Record<string, LayoutPoint>,
): DiagramDocument {
  const known = new Set(document.nodes.map((node) => node.id));
  const nextPositions: Record<string, LayoutPoint> = {};
  for (const [id, point] of Object.entries(positions)) {
    if (!known.has(id) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    nextPositions[id] = { x: point.x, y: point.y };
  }
  const next: DiagramDocument = {
    ...document,
    layout: {
      version: LAYOUT_SECTION_VERSION,
      revision: (document.layout?.revision ?? 0) + 1,
      positions: nextPositions,
    },
  };
  const validated = validateDocument(next);
  return validated.ok ? validated.document : document;
}
