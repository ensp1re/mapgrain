import { DOCUMENT_KIND, type DiagramDocument } from "@mapgrain/document";
import type { Point, Size } from "./types/geometry.ts";

const LANE_PAD_X = 28;
const LANE_PAD_Y = 22;
const LANE_GAP = 32;
const NODE_GAP_X = 44;
const NODE_GAP_Y = 24;
const FALLBACK_SIZE = { width: 72, height: 36 };

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

/**
 * Layer index per node over the whole document, not per lane.
 *
 * Layering each lane on its own put a step that follows another lane's step at an unrelated
 * x, so a swimlane read as three disconnected rows. Sharing one column grid is what makes a
 * handoff between lanes legible.
 */
function documentLayers(document: DiagramDocument): Map<string, number> {
  const incoming = new Map<string, number>(document.nodes.map((node) => [node.id, 0]));
  for (const edge of document.edges) {
    if (edge.source.nodeId === edge.target.nodeId) continue;
    incoming.set(edge.target.nodeId, (incoming.get(edge.target.nodeId) ?? 0) + 1);
  }
  const remaining = new Map(document.nodes.map((node) => [node.id, node]));
  const layerOf = new Map<string, number>();
  let layer = 0;
  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((node) => (incoming.get(node.id) ?? 0) === 0);
    // A cycle leaves nobody ready; take the first remaining node so layering still terminates.
    const fallback = [...remaining.values()][0];
    const current = ready.length > 0 ? ready : fallback ? [fallback] : [];
    if (current.length === 0) break;
    for (const node of current) {
      layerOf.set(node.id, layer);
      remaining.delete(node.id);
    }
    for (const node of current) {
      for (const edge of document.edges) {
        if (edge.source.nodeId !== node.id || !remaining.has(edge.target.nodeId)) continue;
        incoming.set(edge.target.nodeId, Math.max(0, (incoming.get(edge.target.nodeId) ?? 1) - 1));
      }
    }
    layer += 1;
  }
  return layerOf;
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

  // One column grid shared by every lane: a column is as wide as the widest node in it.
  const layerOf = documentLayers(document);
  const columnWidth = new Map<number, number>();
  for (const node of document.nodes) {
    const layer = layerOf.get(node.id) ?? 0;
    const width = (sizes.get(node.id) ?? FALLBACK_SIZE).width;
    columnWidth.set(layer, Math.max(columnWidth.get(layer) ?? 0, width));
  }
  const columnX = new Map<number, number>();
  let cursor = LANE_PAD_X;
  for (const layer of [...columnWidth.keys()].sort((left, right) => left - right)) {
    columnX.set(layer, cursor);
    cursor += (columnWidth.get(layer) ?? 0) + NODE_GAP_X;
  }

  const positions = new Map<string, Point>();
  let y = 0;
  for (const row of rows) {
    if (row.nodes.length === 0) continue;
    const stackY = new Map<number, number>();
    let rowBottom = y + LANE_PAD_Y;
    for (const node of [...row.nodes].sort(
      (left, right) => (layerOf.get(left.id) ?? 0) - (layerOf.get(right.id) ?? 0),
    )) {
      const layer = layerOf.get(node.id) ?? 0;
      const size = sizes.get(node.id) ?? FALLBACK_SIZE;
      const top = stackY.get(layer) ?? y + LANE_PAD_Y;
      positions.set(node.id, { x: columnX.get(layer) ?? LANE_PAD_X, y: top });
      stackY.set(layer, top + size.height + NODE_GAP_Y);
      rowBottom = Math.max(rowBottom, top + size.height);
    }
    y = rowBottom + LANE_PAD_Y + LANE_GAP;
  }
  return positions;
}
