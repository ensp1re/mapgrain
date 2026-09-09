import { DOCUMENT_KIND, type DiagramDocument } from "@mapgrain/document";
import type { Point, Size } from "./types/geometry.ts";

const GAP = 48;
export const SEQUENCE_MESSAGE_GAP = 40;
export const SEQUENCE_HEADER_GAP = 28;

export function sequenceMessageY(order: number, headerBottom: number): number {
  return headerBottom + SEQUENCE_HEADER_GAP + (order - 1) * SEQUENCE_MESSAGE_GAP;
}

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
