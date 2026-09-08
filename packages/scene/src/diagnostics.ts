import { DIAGNOSTIC_SEVERITY, GEOMETRY_DIAGNOSTIC } from "./constants/diagnostics.ts";
import { rectContains, rectsOverlap } from "./geometry.ts";
import type { Scene } from "./types/scene.ts";

export interface GeometryDiagnostic {
  code: (typeof GEOMETRY_DIAGNOSTIC)[keyof typeof GEOMETRY_DIAGNOSTIC];
  severity: (typeof DIAGNOSTIC_SEVERITY)[keyof typeof DIAGNOSTIC_SEVERITY];
  message: string;
  ids: string[];
}

export function diagnoseGeometry(scene: Scene): GeometryDiagnostic[] {
  const issues: GeometryDiagnostic[] = [];
  for (let i = 0; i < scene.nodes.length; i += 1) {
    const left = scene.nodes[i];
    if (!left) continue;
    if (
      left.rect.x < scene.bounds.x ||
      left.rect.y < scene.bounds.y ||
      left.rect.x + left.rect.width > scene.bounds.x + scene.bounds.width ||
      left.rect.y + left.rect.height > scene.bounds.y + scene.bounds.height
    ) {
      issues.push({
        code: GEOMETRY_DIAGNOSTIC.CLIPPING,
        severity: DIAGNOSTIC_SEVERITY.WARNING,
        message: `node "${left.id}" clips the scene bounds`,
        ids: [left.id],
      });
    }
    const group = scene.groups.find((item) => item.id === left.groupId);
    if (group && !rectContains(group.rect, left.rect)) {
      issues.push({
        code: GEOMETRY_DIAGNOSTIC.CONTAINMENT,
        severity: DIAGNOSTIC_SEVERITY.WARNING,
        message: `node "${left.id}" is not contained by group "${group.id}"`,
        ids: [left.id, group.id],
      });
    }
    for (let j = i + 1; j < scene.nodes.length; j += 1) {
      const right = scene.nodes[j];
      if (!right) continue;
      if (!rectsOverlap(left.rect, right.rect)) continue;
      issues.push({
        code: GEOMETRY_DIAGNOSTIC.OVERLAP,
        severity: DIAGNOSTIC_SEVERITY.WARNING,
        message: `nodes "${left.id}" and "${right.id}" overlap`,
        ids: [left.id, right.id],
      });
    }
  }
  for (const edge of scene.edges) {
    const hit = scene.nodes.find((node) => rectsOverlap(node.rect, edge.labelBox));
    if (!hit) continue;
    issues.push({
      code: GEOMETRY_DIAGNOSTIC.LABEL_CLEARANCE,
      severity: DIAGNOSTIC_SEVERITY.WARNING,
      message: `edge "${edge.id}" label overlaps node "${hit.id}"`,
      ids: [edge.id, hit.id],
    });
  }
  return issues;
}
