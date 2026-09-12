import { DOCUMENT_KIND, type DocumentKind } from "@mapgrain/document";
import { unionRects } from "./geometry.ts";
import type { SceneGroup } from "./types/scene.ts";

export const LANE_ROLE = "lane" as const;

/**
 * Lanes span the full width and stack without gaps.
 *
 * Each frame used to be derived independently from its own members, which left a dead gutter
 * between consecutive lanes — they floated apart instead of reading as one banded diagram.
 * Snapping each lane's top to the previous lane's bottom keeps them contiguous whatever the
 * padding constants are.
 */
export function applyWorkflowLanes(kind: DocumentKind, groups: SceneGroup[]): SceneGroup[] {
  if (kind !== DOCUMENT_KIND.WORKFLOW) return groups;
  const lanes = groups.filter((group) => group.parentId === null);
  if (lanes.length === 0) return groups;
  const span = unionRects(lanes.map((group) => group.rect));
  const ordered = [...lanes].sort((left, right) => left.rect.y - right.rect.y);

  const snapped = new Map<string, { y: number; height: number }>();
  let top = span.y;
  for (const lane of ordered) {
    const bottom = lane.rect.y + lane.rect.height;
    snapped.set(lane.id, { y: top, height: Math.max(0, bottom - top) });
    top = bottom;
  }

  return groups.map((group) => {
    if (group.parentId !== null) return group;
    const band = snapped.get(group.id);
    if (!band) return group;
    return {
      ...group,
      role: LANE_ROLE,
      rect: { x: span.x, y: band.y, width: span.width, height: band.height },
    };
  });
}
