import type { DiagramDocument } from "@mapgrain/document";
import { sequencePositions as sceneSequencePositions, type Point, type Size } from "@mapgrain/scene";

export { isSequenceDocument } from "@mapgrain/scene";

export function sequencePositions(
  document: DiagramDocument,
  sizes: Map<string, Size>,
): Record<string, Point> {
  return Object.fromEntries(sceneSequencePositions(document, sizes));
}
