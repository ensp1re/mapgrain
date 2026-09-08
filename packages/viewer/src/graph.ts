import { EDGE_DIRECTION, REACH_MODE, ROUTE_LIMIT } from "./constants/view.ts";
import type { GraphEdge, GraphIndex, NamedView, ReachResult, RouteResult } from "./types/view.ts";

function pushHop(
  map: Map<string, Array<{ nodeId: string; edgeId: string }>>,
  from: string,
  to: string,
  edgeId: string,
): void {
  if (from === to) return;
  const list = map.get(from) ?? [];
  list.push({ nodeId: to, edgeId });
  map.set(from, list);
}

export function buildGraphIndex(edges: GraphEdge[]): GraphIndex {
  const down = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
  const up = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
  for (const edge of edges) {
    if (edge.direction === EDGE_DIRECTION.FORWARD) {
      pushHop(down, edge.source, edge.target, edge.id);
      pushHop(up, edge.target, edge.source, edge.id);
      continue;
    }
    pushHop(down, edge.source, edge.target, edge.id);
    pushHop(down, edge.target, edge.source, edge.id);
    pushHop(up, edge.source, edge.target, edge.id);
    pushHop(up, edge.target, edge.source, edge.id);
  }
  return { down, up };
}

export function directedReach(index: GraphIndex, start: string, mode: "up" | "down"): ReachResult {
  const hops = mode === REACH_MODE.UP ? index.up : index.down;
  const nodeIds = new Set<string>([start]);
  const edgeIds = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const hop of hops.get(current) ?? []) {
      edgeIds.add(hop.edgeId);
      if (nodeIds.has(hop.nodeId)) continue;
      nodeIds.add(hop.nodeId);
      queue.push(hop.nodeId);
    }
  }
  return { nodeIds: [...nodeIds], edgeIds: [...edgeIds] };
}

export function findRoute(index: GraphIndex, from: string, to: string, limit = ROUTE_LIMIT): RouteResult | null {
  if (from === to) return { nodes: [from], edges: [], alternatives: 1, truncated: false };
  const hops = index.down;
  const parent = new Map<string, { nodeId: string; edgeId: string }>();
  const depth = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const here = depth.get(current) ?? 0;
    for (const hop of hops.get(current) ?? []) {
      if (depth.has(hop.nodeId)) continue;
      depth.set(hop.nodeId, here + 1);
      parent.set(hop.nodeId, { nodeId: current, edgeId: hop.edgeId });
      if (hop.nodeId === to) {
        queue.length = 0;
        break;
      }
      queue.push(hop.nodeId);
    }
  }
  if (!parent.has(to)) return null;
  const nodes = [to];
  const edges: string[] = [];
  let cursor = to;
  while (cursor !== from) {
    const step = parent.get(cursor);
    if (!step) return null;
    edges.unshift(step.edgeId);
    nodes.unshift(step.nodeId);
    cursor = step.nodeId;
  }
  const shortest = (depth.get(to) ?? 0);
  const counted = countShortest(index, from, to, shortest, limit);
  return {
    nodes,
    edges,
    alternatives: counted.count,
    truncated: counted.truncated,
  };
}

function countShortest(
  index: GraphIndex,
  from: string,
  to: string,
  shortest: number,
  limit: number,
): { count: number; truncated: boolean } {
  let count = 0;
  let truncated = false;
  const stack: Array<{ nodeId: string; length: number; seen: Set<string> }> = [
    { nodeId: from, length: 0, seen: new Set([from]) },
  ];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    if (frame.length > shortest) continue;
    if (frame.nodeId === to) {
      count += 1;
      if (count >= limit) {
        truncated = true;
        break;
      }
      continue;
    }
    for (const hop of index.down.get(frame.nodeId) ?? []) {
      if (frame.seen.has(hop.nodeId)) continue;
      const nextSeen = new Set(frame.seen);
      nextSeen.add(hop.nodeId);
      stack.push({ nodeId: hop.nodeId, length: frame.length + 1, seen: nextSeen });
    }
  }
  return { count: Math.max(count, 1), truncated };
}

export function visibleIdsForView(
  view: NamedView | undefined,
  knownNodes: Set<string>,
  knownEdges: Set<string>,
): { nodeIds: string[] | null; edgeIds: string[] | null } {
  if (!view) return { nodeIds: null, edgeIds: null };
  return {
    nodeIds: view.nodeIds ? view.nodeIds.filter((id) => knownNodes.has(id)) : null,
    edgeIds: view.edgeIds ? view.edgeIds.filter((id) => knownEdges.has(id)) : null,
  };
}
