import type { Point, Size } from "@mapgrain/scene";
import { LAYOUT_CONFLICT_CODE } from "./constants/codes.ts";
import type { LayoutConflict } from "./types/layout.ts";

const GAP = 8;

function rect(origin: Point, size: Size) {
  return {
    x: origin.x,
    y: origin.y,
    width: size.width,
    height: size.height,
  };
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width + GAP &&
    a.x + a.width + GAP > b.x &&
    a.y < b.y + b.height + GAP &&
    a.y + a.height + GAP > b.y
  );
}

export function applyPins(
  elkPositions: Record<string, Point>,
  sizes: Map<string, Size>,
  pins: Record<string, Point>,
): { positions: Record<string, Point>; conflict: LayoutConflict | null } {
  const positions = { ...elkPositions };
  const pinnedIds = Object.keys(pins);
  for (const id of pinnedIds) {
    const pin = pins[id];
    if (pin && positions[id]) positions[id] = { x: pin.x, y: pin.y };
  }

  const overlappingNodeIds = new Set<string>();
  const ids = Object.keys(positions);
  for (let i = 0; i < ids.length; i += 1) {
    const leftId = ids[i];
    if (!leftId) continue;
    const leftOrigin = positions[leftId];
    const leftSize = sizes.get(leftId);
    if (!leftOrigin || !leftSize) continue;
    for (let j = i + 1; j < ids.length; j += 1) {
      const rightId = ids[j];
      if (!rightId) continue;
      const rightOrigin = positions[rightId];
      const rightSize = sizes.get(rightId);
      if (!rightOrigin || !rightSize) continue;
      const pinInvolved = Boolean(pins[leftId] || pins[rightId]);
      if (!pinInvolved) continue;
      if (overlaps(rect(leftOrigin, leftSize), rect(rightOrigin, rightSize))) {
        overlappingNodeIds.add(leftId);
        overlappingNodeIds.add(rightId);
      }
    }
  }

  if (overlappingNodeIds.size === 0) {
    return { positions, conflict: null };
  }

  return {
    positions: elkPositions,
    conflict: {
      code: LAYOUT_CONFLICT_CODE.INSUFFICIENT_SPACE,
      message:
        "Pinned nodes cannot keep their positions without overlapping. Pins were not moved.",
      pinnedNodeIds: pinnedIds,
      overlappingNodeIds: [...overlappingNodeIds],
      pins: { ...pins },
    },
  };
}
