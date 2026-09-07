import type { DiagramDocument } from "@mapgrain/document";
import type { PositionMap } from "../types/editor.ts";

export function pinsFromDocument(
  document: DiagramDocument,
  positions: PositionMap,
): Record<string, { x: number; y: number }> {
  const pins: Record<string, { x: number; y: number }> = {};
  for (const id of document.layoutHints.pinnedNodeIds) {
    const pos = positions[id];
    if (pos) pins[id] = { x: pos.x, y: pos.y };
  }
  return pins;
}

export function mergePositions(current: PositionMap, next: PositionMap): PositionMap {
  return { ...current, ...next };
}
