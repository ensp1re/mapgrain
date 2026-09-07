import type { Node } from "@xyflow/react";
import type { PositionMap } from "../types/editor.ts";

export function positionsFromScene(
  nodes: Array<{ id: string; rect: { x: number; y: number } }>,
): PositionMap {
  return Object.fromEntries(nodes.map((node) => [node.id, { x: node.rect.x, y: node.rect.y }]));
}

export function absolutePosition(node: Node, byId: Map<string, Node>): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

export function positionsFromFlow(nodes: Node[], previous: PositionMap): PositionMap {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const next: PositionMap = { ...previous };
  for (const node of nodes) {
    if (node.type !== "component") continue;
    next[node.id] = absolutePosition(node, byId);
  }
  return next;
}

export function samePositions(left: PositionMap, right: PositionMap): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const a = left[key];
    const b = right[key];
    if (!a || !b || a.x !== b.x || a.y !== b.y) return false;
  }
  return true;
}
