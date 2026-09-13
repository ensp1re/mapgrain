import { NODE_KIND, type DiagramDocument } from "@mapgrain/document";
import type { Scene } from "../../src/index.ts";

/**
 * Branches out of a decision that are drawn right to left.
 *
 * A rework loop runs backwards on purpose, so counting backward edges proves nothing — a good
 * and a bad layout of the same loop have one each. What separates them is *which* edge got
 * reversed. The reader follows a decision to its outcomes, so those must read forward; the leg
 * that returns to an earlier step is the one allowed to go back. Laying out "checks green? →
 * fix and push again" backwards put the repair before the build it repeats.
 */
export function backwardDecisionBranches(document: DiagramDocument, scene: Scene): string[] {
  const rect = new Map(scene.nodes.map((node) => [node.id, node.rect]));
  const decisions = new Set(
    document.nodes.filter((node) => node.kind === NODE_KIND.DECISION).map((node) => node.id),
  );
  const wrong: string[] = [];
  for (const edge of scene.edges) {
    if (!decisions.has(edge.source.nodeId)) continue;
    const from = rect.get(edge.source.nodeId);
    const to = rect.get(edge.target.nodeId);
    if (!from || !to) continue;
    if (to.x + to.width < from.x) wrong.push(`${edge.source.nodeId} -> ${edge.target.nodeId}`);
  }
  return wrong;
}

/** Left-to-right order of the steps, so a fixture's own reading order can be asserted. */
export function stepOrder(scene: Scene): string[] {
  return [...scene.nodes].sort((left, right) => left.rect.x - right.rect.x).map((node) => node.id);
}
