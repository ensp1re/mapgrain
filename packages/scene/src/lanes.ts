import { DOCUMENT_KIND, type DocumentKind } from "@mapgrain/document";
import { unionRects } from "./geometry.ts";
import type { SceneGroup } from "./types/scene.ts";

export const LANE_ROLE = "lane" as const;

export function applyWorkflowLanes(kind: DocumentKind, groups: SceneGroup[]): SceneGroup[] {
  if (kind !== DOCUMENT_KIND.WORKFLOW) return groups;
  const lanes = groups.filter((group) => group.parentId === null);
  if (lanes.length === 0) return groups;
  const span = unionRects(lanes.map((group) => group.rect));
  return groups.map((group) => {
    if (group.parentId !== null) return group;
    return {
      ...group,
      role: LANE_ROLE,
      rect: { x: span.x, y: group.rect.y, width: span.width, height: group.rect.height },
    };
  });
}
