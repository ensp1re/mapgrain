import { EDGE_DIRECTION, type DiagramDocument, type DiagramEdge } from "@mapgrain/document";

export function nodeLabel(document: DiagramDocument, id: string): string {
  return document.nodes.find((node) => node.id === id)?.label ?? id;
}

export function directionLabel(direction: DiagramEdge["direction"]): string {
  if (direction === EDGE_DIRECTION.BOTH) return "both ways";
  if (direction === EDGE_DIRECTION.NONE) return "no arrow";
  return "one way";
}

export function relationCaption(document: DiagramDocument, edge: DiagramEdge): string {
  return `${nodeLabel(document, edge.source.nodeId)} ${directionLabel(edge.direction)} ${nodeLabel(document, edge.target.nodeId)}`;
}
