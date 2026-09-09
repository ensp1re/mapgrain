import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compareDocuments, validateDocument } from "../src/index.ts";

const fixture = new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url);

test("compare reports added, removed, and changed nodes and edges", async () => {
  const loaded = validateDocument(JSON.parse(await readFile(fixture, "utf8")) as unknown);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const before = loaded.document;
  const after = structuredClone(before);
  after.nodes = after.nodes.filter((node) => node.id !== "provider");
  after.nodes = after.nodes.map((node) => (node.id === "gateway" ? { ...node, label: "Workspace API v2" } : node));
  after.nodes.push({
    id: "cache",
    kind: "datastore",
    label: "Cache",
    groupId: null,
    ports: [],
  });
  after.edges = after.edges.filter((edge) => edge.id !== "e-provider-gateway");
  const delta = compareDocuments(before, after);
  assert.deepEqual(delta.removedNodeIds, ["provider"]);
  assert.ok(delta.addedNodeIds.includes("cache"));
  assert.ok(delta.changedNodeIds.includes("gateway"));
  assert.ok(delta.removedEdgeIds.includes("e-provider-gateway"));
  assert.deepEqual(delta.movedNodeIds, []);
  assert.deepEqual(delta.reroutedEdgeIds, []);
});

test("compare separates layout moves and port reroutes from semantic edits", async () => {
  const loaded = validateDocument(JSON.parse(await readFile(fixture, "utf8")) as unknown);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const before = structuredClone(loaded.document);
  before.layout = { version: 1, revision: 1, positions: { gateway: { x: 0, y: 0 } } };
  const after = structuredClone(before);
  after.layout = { version: 1, revision: 1, positions: { gateway: { x: 40, y: 0 } } };
  after.edges = after.edges.map((edge) =>
    edge.id === "e-gateway-document"
      ? { ...edge, source: { ...edge.source, portId: "east" } }
      : edge,
  );
  const delta = compareDocuments(before, after);
  assert.deepEqual(delta.changedNodeIds, []);
  assert.deepEqual(delta.movedNodeIds, ["gateway"]);
  assert.deepEqual(delta.changedEdgeIds, []);
  assert.deepEqual(delta.reroutedEdgeIds, ["e-gateway-document"]);
});
