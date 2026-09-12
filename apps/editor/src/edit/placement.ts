import { buildScene, rectsOverlap } from "@mapgrain/scene";
import type { Point } from "@mapgrain/scene";
import { DOCUMENT_KIND, type DiagramDocument } from "@mapgrain/document";
import { NEW_NODE_GAP, NEW_NODE_RING_STEP, NEW_NODE_RINGS, NEW_NODE_SIZE } from "../constants/edit.ts";
import type { PositionMap } from "../types/editor.ts";

/** Candidate spots on the nth ring around a centre, nearest first. */
function ringSpots(center: Point, ring: number): Point[] {
  if (ring === 0) return [center];
  const step = ring * NEW_NODE_RING_STEP;
  return [
    { x: center.x + step, y: center.y },
    { x: center.x - step, y: center.y },
    { x: center.x, y: center.y + step },
    { x: center.x, y: center.y - step },
    { x: center.x + step, y: center.y + step },
    { x: center.x - step, y: center.y + step },
    { x: center.x + step, y: center.y - step },
    { x: center.x - step, y: center.y - step },
  ];
}

/**
 * The first spot near `center` where a new card does not land on an existing one.
 * New nodes used to be dropped on a fixed row that ignored both the viewport and the
 * diagram, so on a panned canvas they appeared offscreen or stacked.
 */
export function freeSpotNear(
  document: DiagramDocument,
  positions: PositionMap,
  center: Point,
): Point {
  const scene = buildScene(document, { positions });
  const taken = scene.ok ? scene.scene.nodes.map((node) => node.rect) : [];
  for (let ring = 0; ring <= NEW_NODE_RINGS; ring += 1) {
    for (const spot of ringSpots(center, ring)) {
      const candidate = {
        x: Math.round(spot.x - NEW_NODE_SIZE.width / 2),
        y: Math.round(spot.y - NEW_NODE_SIZE.height / 2),
      };
      const box = {
        x: candidate.x - NEW_NODE_GAP,
        y: candidate.y - NEW_NODE_GAP,
        width: NEW_NODE_SIZE.width + NEW_NODE_GAP * 2,
        height: NEW_NODE_SIZE.height + NEW_NODE_GAP * 2,
      };
      if (!taken.some((rect) => rectsOverlap(box, rect))) return candidate;
    }
  }
  return { x: Math.round(center.x), y: Math.round(center.y) };
}

/** A new node joins the group of the current selection, so adding inside a lane works. */
export function groupForNewNode(
  document: DiagramDocument,
  selectedId: string | undefined,
): string | null {
  if (document.kind === DOCUMENT_KIND.SEQUENCE) return null;
  if (!selectedId) return null;
  const selected = document.nodes.find((node) => node.id === selectedId);
  if (selected) return selected.groupId;
  return document.groups.some((group) => group.id === selectedId) ? selectedId : null;
}
