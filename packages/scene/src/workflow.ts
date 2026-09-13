import { DOCUMENT_KIND, type DiagramDocument } from "@mapgrain/document";
import { EDGE_STUB, ROUTE_CHANNEL_STEP } from "./constants/metrics.ts";
import type { Point, Size } from "./types/geometry.ts";

const LANE_PAD_X = 28;
const LANE_PAD_Y = 22;
const LANE_GAP = 32;
/**
 * A connection stubs EDGE_STUB out of each card, then needs a channel to turn in. At 44 that
 * left 4px between the stubs, and one step of ROUTE_CHANNEL_STEP put the line inside the next
 * card. The column gap now holds both stubs and a few channels.
 */
const NODE_GAP_X = EDGE_STUB * 2 + ROUTE_CHANNEL_STEP;
const NODE_GAP_Y = 32;
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
 * The edges that close a loop, found by depth-first search from the steps nothing leads to.
 *
 * A rework loop — "checks failed, go fix it and build again" — is a cycle, and a cycle has no
 * topological order. Layering one anyway used to place the loop's target in the first free
 * column, so "Fix and push again" sat before the build it repeats and the whole branch read
 * backwards. Layered drawing solves this by setting the closing edges aside, ordering what is
 * left, and letting those edges run backwards on purpose. This is that step.
 */
function loopEdges(document: DiagramDocument): Set<string> {
  const out = new Map<string, Array<{ id: string; to: string }>>();
  for (const edge of document.edges) {
    if (edge.source.nodeId === edge.target.nodeId) continue;
    const list = out.get(edge.source.nodeId) ?? [];
    list.push({ id: edge.id, to: edge.target.nodeId });
    out.set(edge.source.nodeId, list);
  }
  const targets = new Set(document.edges.map((edge) => edge.target.nodeId));
  const roots = document.nodes.filter((node) => !targets.has(node.id)).map((node) => node.id);
  const starts = roots.length > 0 ? roots : document.nodes.slice(0, 1).map((node) => node.id);

  const closing = new Set<string>();
  const done = new Set<string>();
  const onPath = new Set<string>();
  const walk = (id: string) => {
    onPath.add(id);
    for (const edge of out.get(id) ?? []) {
      if (onPath.has(edge.to)) closing.add(edge.id);
      else if (!done.has(edge.to)) walk(edge.to);
    }
    onPath.delete(id);
    done.add(id);
  };
  for (const id of starts) if (!done.has(id)) walk(id);
  // A component reachable from nothing still has to be visited, or its edges never count.
  for (const node of document.nodes) if (!done.has(node.id)) walk(node.id);
  return closing;
}

/**
 * Layer index per node over the whole document, not per lane.
 *
 * Layering each lane on its own put a step that follows another lane's step at an unrelated
 * x, so a swimlane read as three disconnected rows. Sharing one column grid is what makes a
 * handoff between lanes legible.
 */
function documentLayers(document: DiagramDocument): Map<string, number> {
  const closing = loopEdges(document);
  const forward = document.edges.filter(
    (edge) => edge.source.nodeId !== edge.target.nodeId && !closing.has(edge.id),
  );
  const incoming = new Map<string, number>(document.nodes.map((node) => [node.id, 0]));
  for (const edge of forward) {
    incoming.set(edge.target.nodeId, (incoming.get(edge.target.nodeId) ?? 0) + 1);
  }
  const remaining = new Map(document.nodes.map((node) => [node.id, node]));
  const layerOf = new Map<string, number>();
  let layer = 0;
  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((node) => (incoming.get(node.id) ?? 0) === 0);
    // Setting the closing edges aside leaves an acyclic graph, so this only has to cope with a
    // document whose edges were not all reachable. Take the least-blocked node and continue.
    const fallback = [...remaining.values()].sort(
      (left, right) => (incoming.get(left.id) ?? 0) - (incoming.get(right.id) ?? 0),
    )[0];
    const current = ready.length > 0 ? ready : fallback ? [fallback] : [];
    if (current.length === 0) break;
    for (const node of current) {
      layerOf.set(node.id, layer);
      remaining.delete(node.id);
    }
    for (const node of current) {
      for (const edge of forward) {
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
