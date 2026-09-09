import type { DiagramDocument } from "@mapgrain/document";
import { workflowLanePositions as sceneWorkflowLanePositions, type Point, type Size } from "@mapgrain/scene";

export { isWorkflowLanesDocument } from "@mapgrain/scene";

export function workflowLanePositions(
  document: DiagramDocument,
  sizes: Map<string, Size>,
): Record<string, Point> {
  return Object.fromEntries(sceneWorkflowLanePositions(document, sizes));
}
