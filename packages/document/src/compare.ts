import type { DiagramDocument } from "./types/document.ts";

export interface DocumentDelta {
  addedNodeIds: string[];
  removedNodeIds: string[];
  changedNodeIds: string[];
  addedEdgeIds: string[];
  removedEdgeIds: string[];
  changedEdgeIds: string[];
}

function nodeKey(node: DiagramDocument["nodes"][number]): string {
  return JSON.stringify([node.kind, node.label, node.groupId, node.marker ?? null]);
}

function edgeKey(edge: DiagramDocument["edges"][number]): string {
  return JSON.stringify([
    edge.source.nodeId,
    edge.target.nodeId,
    edge.type,
    edge.direction,
    edge.label ?? null,
    edge.order ?? null,
    edge.guard ?? null,
    edge.outcome ?? null,
  ]);
}

export function compareDocuments(before: DiagramDocument, after: DiagramDocument): DocumentDelta {
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const beforeEdges = new Map(before.edges.map((edge) => [edge.id, edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edge.id, edge]));
  const addedNodeIds = after.nodes.filter((node) => !beforeNodes.has(node.id)).map((node) => node.id);
  const removedNodeIds = before.nodes.filter((node) => !afterNodes.has(node.id)).map((node) => node.id);
  const changedNodeIds = after.nodes
    .filter((node) => {
      const previous = beforeNodes.get(node.id);
      return previous !== undefined && nodeKey(previous) !== nodeKey(node);
    })
    .map((node) => node.id);
  const addedEdgeIds = after.edges.filter((edge) => !beforeEdges.has(edge.id)).map((edge) => edge.id);
  const removedEdgeIds = before.edges.filter((edge) => !afterEdges.has(edge.id)).map((edge) => edge.id);
  const changedEdgeIds = after.edges
    .filter((edge) => {
      const previous = beforeEdges.get(edge.id);
      return previous !== undefined && edgeKey(previous) !== edgeKey(edge);
    })
    .map((edge) => edge.id);
  return { addedNodeIds, removedNodeIds, changedNodeIds, addedEdgeIds, removedEdgeIds, changedEdgeIds };
}
