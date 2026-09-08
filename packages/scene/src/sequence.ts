import { DOCUMENT_KIND, type DiagramDocument } from "@mapgrain/document";
import type { Point, Size } from "./types/geometry.ts";

const GAP = 48;

export function isSequenceDocument(document: DiagramDocument): boolean {
  return document.kind === DOCUMENT_KIND.SEQUENCE;
}

export function sequencePositions(
  document: DiagramDocument,
  sizes: Map<string, Size>,
): Map<string, Point> {
  const positions = new Map<string, Point>();
  let x = 0;
  for (const node of document.nodes) {
    const size = sizes.get(node.id) ?? { width: 72, height: 36 };
    positions.set(node.id, { x, y: 0 });
    x += size.width + GAP;
  }
  return positions;
}
