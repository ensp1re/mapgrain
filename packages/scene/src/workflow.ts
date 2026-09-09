import { DOCUMENT_KIND, type DiagramDocument, type DiagramNode } from "@mapgrain/document";
import type { Point, Size } from "./types/geometry.ts";

const LANE_PAD_X = 28;
const LANE_PAD_Y = 36;
const LANE_GAP = 32;
const NODE_GAP_X = 72;
const NODE_GAP_Y = 24;

export function isWorkflowLanesDocument(document: DiagramDocument): boolean {
  return document.kind === DOCUMENT_KIND.WORKFLOW && document.groups.some((group) => group.parentId === null);
}

function topLaneId(document: DiagramDocument, groupId: string | null): string | null {
  let current = groupId;
  const byId = new Map(document.groups.map((group) => [group.id, group]));
  while (current) {
    const group = byId.get(current);
    if (!group) return current;
    if (group.parentId === null) return group.id;
    current = group.parentId;
  }
  return null;
}

function laneLayers(members: DiagramNode[], document: DiagramDocument): DiagramNode[][] {
  const ids = new Set(members.map((node) => node.id));
  const incoming = new Map<string, number>(members.map((node) => [node.id, 0]));
  for (const edge of document.edges) {
    if (!ids.has(edge.source.nodeId) || !ids.has(edge.target.nodeId)) continue;
    incoming.set(edge.target.nodeId, (incoming.get(edge.target.nodeId) ?? 0) + 1);
  }
  const remaining = new Map(members.map((node) => [node.id, node]));
  const layers: DiagramNode[][] = [];
  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((node) => (incoming.get(node.id) ?? 0) === 0);
    const fallback = [...remaining.values()][0];
    const layer = ready.length > 0 ? ready : fallback ? [fallback] : [];
    if (layer.length === 0) break;
    layers.push(layer);
    for (const node of layer) {
      remaining.delete(node.id);
      for (const edge of document.edges) {
        if (edge.source.nodeId !== node.id || !remaining.has(edge.target.nodeId)) continue;
        incoming.set(edge.target.nodeId, Math.max(0, (incoming.get(edge.target.nodeId) ?? 1) - 1));
      }
    }
  }
  return layers;
}

export function workflowLanePositions(
  document: DiagramDocument,
  sizes: Map<string, Size>,
): Map<string, Point> {
  const lanes = document.groups.filter((group) => group.parentId === null);
  const rows = lanes.map((lane) => ({
    id: lane.id,
    nodes: document.nodes.filter((node) => topLaneId(document, node.groupId) === lane.id),
  }));
  const assigned = new Set(rows.flatMap((row) => row.nodes.map((node) => node.id)));
  const rest = document.nodes.filter((node) => !assigned.has(node.id));
  if (rest.length > 0) rows.push({ id: "", nodes: rest });

  const positions = new Map<string, Point>();
  let y = 0;
  for (const row of rows) {
    if (row.nodes.length === 0) continue;
    let x = LANE_PAD_X;
    let rowBottom = y + LANE_PAD_Y;
    for (const layer of laneLayers(row.nodes, document)) {
      let stackY = y + LANE_PAD_Y;
      let layerWidth = 0;
      for (const node of layer) {
        const size = sizes.get(node.id) ?? { width: 72, height: 36 };
        positions.set(node.id, { x, y: stackY });
        stackY += size.height + NODE_GAP_Y;
        layerWidth = Math.max(layerWidth, size.width);
      }
      rowBottom = Math.max(rowBottom, stackY - NODE_GAP_Y);
      x += layerWidth + NODE_GAP_X;
    }
    y = rowBottom + LANE_PAD_Y + LANE_GAP;
  }
  return positions;
}
