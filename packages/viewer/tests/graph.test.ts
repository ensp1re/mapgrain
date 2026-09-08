import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { EDGE_DIRECTION, ROUTE_LIMIT } from "../src/constants/view.ts";
import { buildGraphIndex, directedReach, findRoute, visibleIdsForView } from "../src/graph.ts";
import type { GraphEdge } from "../src/types/view.ts";

const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

interface FixtureEdge {
  id: string;
  source: { nodeId: string };
  target: { nodeId: string };
  direction: GraphEdge["direction"];
}

interface FixtureDoc {
  edges: FixtureEdge[];
}

async function loadEdges(name: string): Promise<GraphEdge[]> {
  const raw = JSON.parse(await readFile(path.join(fixtures, name), "utf8")) as FixtureDoc;
  return raw.edges.map((edge) => ({
    id: edge.id,
    source: edge.source.nodeId,
    target: edge.target.nodeId,
    direction: edge.direction,
  }));
}

function sorted(values: string[]): string[] {
  return [...values].sort();
}

test("nested-groups downstream of gateway follows forward edges", async () => {
  const index = buildGraphIndex(await loadEdges("nested-groups.json"));
  const down = directedReach(index, "gateway", "down");
  assert.deepEqual(sorted(down.nodeIds), ["document", "gateway", "layout", "renderer"]);
  assert.deepEqual(sorted(down.edgeIds), ["e-document-layout", "e-gateway-document", "e-layout-renderer"]);
  const up = directedReach(index, "gateway", "up");
  assert.deepEqual(sorted(up.nodeIds), ["gateway", "provider"]);
  assert.deepEqual(up.edgeIds, ["e-provider-gateway"]);
});

test("nested-groups route uses the directed path and rejects the reverse", async () => {
  const index = buildGraphIndex(await loadEdges("nested-groups.json"));
  const found = findRoute(index, "gateway", "renderer");
  assert.ok(found);
  assert.deepEqual(found?.nodes, ["gateway", "document", "layout", "renderer"]);
  assert.deepEqual(found?.edges, ["e-gateway-document", "e-document-layout", "e-layout-renderer"]);
  assert.equal(found?.alternatives, 1);
  assert.equal(found?.truncated, false);
  assert.equal(findRoute(index, "renderer", "provider"), null);
  assert.equal(findRoute(index, "renderer", "gateway"), null);
});

test("cycles terminate without looping and keep the closing edge", async () => {
  const index = buildGraphIndex(await loadEdges("cycle.json"));
  const down = directedReach(index, "ingest", "down");
  assert.deepEqual(sorted(down.nodeIds), ["ingest", "score", "store"]);
  assert.deepEqual(sorted(down.edgeIds), ["e1", "e2", "e3"]);
  const found = findRoute(index, "ingest", "store");
  assert.deepEqual(found?.nodes, ["ingest", "score", "store"]);
  assert.equal(findRoute(index, "ingest", "ingest")?.nodes.length, 1);
});

test("both and none edges are walkable in either direction", () => {
  const both: GraphEdge[] = [{ id: "ab", source: "a", target: "b", direction: EDGE_DIRECTION.BOTH }];
  const none: GraphEdge[] = [{ id: "cd", source: "c", target: "d", direction: EDGE_DIRECTION.NONE }];
  const bothIndex = buildGraphIndex(both);
  const noneIndex = buildGraphIndex(none);
  assert.deepEqual(sorted(directedReach(bothIndex, "a", "down").nodeIds), ["a", "b"]);
  assert.deepEqual(sorted(directedReach(bothIndex, "b", "down").nodeIds), ["a", "b"]);
  assert.deepEqual(sorted(directedReach(bothIndex, "a", "up").nodeIds), ["a", "b"]);
  assert.ok(findRoute(bothIndex, "b", "a"));
  assert.deepEqual(sorted(directedReach(noneIndex, "d", "down").nodeIds), ["c", "d"]);
  assert.ok(findRoute(noneIndex, "d", "c"));
});

test("disconnected nodes have no route and self-loops are ignored", async () => {
  const index = buildGraphIndex(await loadEdges("disconnected.json"));
  const island = directedReach(index, "billing", "down");
  assert.deepEqual(island.nodeIds, ["billing"]);
  assert.deepEqual(island.edgeIds, []);
  assert.equal(findRoute(index, "billing", "search"), null);
  const withLoop = buildGraphIndex([
    { id: "loop", source: "billing", target: "billing", direction: EDGE_DIRECTION.FORWARD },
    { id: "e-search-index", source: "search", target: "index", direction: EDGE_DIRECTION.FORWARD },
  ]);
  assert.equal(withLoop.down.get("billing"), undefined);
  assert.ok(findRoute(withLoop, "search", "index"));
});

test("missing view ids are skipped and empty filters stay empty", () => {
  const nodes = new Set(["gateway", "document"]);
  const edges = new Set(["e-gateway-document"]);
  const kept = visibleIdsForView(
    { id: "slice", kind: "overview", name: "Slice", nodeIds: ["gateway", "missing"], edgeIds: ["nope", "e-gateway-document"] },
    nodes,
    edges,
  );
  assert.deepEqual(kept.nodeIds, ["gateway"]);
  assert.deepEqual(kept.edgeIds, ["e-gateway-document"]);
  const missing = visibleIdsForView(
    { id: "gone", kind: "overview", name: "Gone", nodeIds: ["ghost"], edgeIds: ["ghost-edge"] },
    nodes,
    edges,
  );
  assert.deepEqual(missing.nodeIds, []);
  assert.deepEqual(missing.edgeIds, []);
  const open = visibleIdsForView({ id: "overview", kind: "overview", name: "All" }, nodes, edges);
  assert.equal(open.nodeIds, null);
  assert.equal(open.edgeIds, null);
});

test("parallel shortest routes count up to the documented limit", () => {
  const edges: GraphEdge[] = Array.from({ length: 10 }, (_, index) => ({
    id: `p${index}`,
    source: "a",
    target: "b",
    direction: EDGE_DIRECTION.FORWARD,
  }));
  const found = findRoute(buildGraphIndex(edges), "a", "b");
  assert.ok(found);
  assert.equal(found?.nodes.length, 2);
  assert.equal(found?.alternatives, ROUTE_LIMIT);
  assert.equal(found?.truncated, true);
});

test("the 100-node fixture reach and route complete from adjacency indexes", async () => {
  const index = buildGraphIndex(await loadEdges("hundred-nodes.json"));
  const down = directedReach(index, "north00", "down");
  assert.ok(down.nodeIds.includes("north00"));
  assert.ok(down.nodeIds.length > 1);
  const found = findRoute(index, "north00", "north03");
  assert.deepEqual(found?.nodes, ["north00", "north01", "north02", "north03"]);
  assert.equal(findRoute(index, "north03", "north00"), null);
});
