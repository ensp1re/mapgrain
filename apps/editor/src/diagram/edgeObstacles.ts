import type { Node } from "@xyflow/react";
import type { Rect, Size } from "@mapgrain/scene";

export function flowNodeRect(node: Node, byId: Map<string, Node>): Rect {
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
  const pad = 8;
  const width = Number(node.measured?.width ?? node.width ?? node.style?.width ?? 0);
  const height = Number(node.measured?.height ?? node.height ?? node.style?.height ?? 0);
  return { x: x - pad, y: y - pad, width: width + pad * 2, height: height + pad * 2 };
}

export function flowComponentObstacles(nodes: readonly Node[]): Rect[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes
    .filter((node) => node.type === "component")
    .map((node) => flowNodeRect(node, byId))
    .filter((rect) => rect.width > 0 && rect.height > 0);
}

export function captionLabelSize(caption: string, measured?: Size): Size {
  if (measured && measured.width > 0 && measured.height > 0) return measured;
  if (!caption) return { width: 0, height: 0 };
  return { width: Math.max(32, caption.length * 7 + 12), height: 16 };
}
