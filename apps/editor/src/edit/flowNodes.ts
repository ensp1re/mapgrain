import type { Edge, Node } from "@xyflow/react";

function dataField(data: unknown, key: string): unknown {
  if (!data || typeof data !== "object") return undefined;
  return (data as Record<string, unknown>)[key];
}

export function sameNodeContent(left: Node, right: Node): boolean {
  return (
    left.id === right.id &&
    left.type === right.type &&
    left.parentId === right.parentId &&
    left.selected === right.selected &&
    left.position.x === right.position.x &&
    left.position.y === right.position.y &&
    left.style?.width === right.style?.width &&
    left.style?.height === right.style?.height &&
    dataField(left.data, "label") === dataField(right.data, "label") &&
    dataField(left.data, "editing") === dataField(right.data, "editing") &&
    dataField(left.data, "kind") === dataField(right.data, "kind")
  );
}

export function sameEdgeContent(left: Edge, right: Edge): boolean {
  return (
    left.id === right.id &&
    left.source === right.source &&
    left.target === right.target &&
    left.selected === right.selected &&
    left.sourceHandle === right.sourceHandle &&
    left.targetHandle === right.targetHandle &&
    dataField(left.data, "label") === dataField(right.data, "label") &&
    dataField(left.data, "type") === dataField(right.data, "type") &&
    dataField(left.data, "direction") === dataField(right.data, "direction") &&
    dataField(left.data, "caption") === dataField(right.data, "caption")
  );
}

export function reuseUnchangedEdges(previous: Edge[], next: Edge[]): Edge[] {
  if (previous === next) return previous;
  if (previous.length === 0) return next;
  const prior = new Map(previous.map((edge) => [edge.id, edge]));
  let changed = previous.length !== next.length;
  const reused = next.map((edge) => {
    const existing = prior.get(edge.id);
    if (existing && sameEdgeContent(existing, edge)) return existing;
    changed = true;
    return edge;
  });
  return changed ? reused : previous;
}

export function reuseUnchangedNodes(previous: Node[], next: Node[]): Node[] {
  if (previous === next) return previous;
  if (previous.length === 0) return next;
  const prior = new Map(previous.map((node) => [node.id, node]));
  let changed = previous.length !== next.length;
  const reused = next.map((node) => {
    const existing = prior.get(node.id);
    if (existing && sameNodeContent(existing, node)) return existing;
    changed = true;
    return node;
  });
  return changed ? reused : previous;
}
