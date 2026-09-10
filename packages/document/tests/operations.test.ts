import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DOCUMENT_KIND,
  EDGE_DIRECTION,
  EDGE_TYPE,
  NODE_KIND,
  OPERATION_KIND,
  applyOperation,
  applyOperationAt,
  nextPrefixedId,
  validateDocument,
} from "../src/index.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

async function load() {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture invalid");
  return result.document;
}

test("set_node_label succeeds and inverse restores the previous document", async () => {
  const document = await load();
  const others = document.nodes.filter((node) => node.id !== "gateway").map((node) => node.label);
  const result = applyOperation(document, {
    kind: OPERATION_KIND.SET_NODE_LABEL,
    nodeId: "gateway",
    label: "Workspace API v2",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.nodes.find((node) => node.id === "gateway")?.label, "Workspace API v2");
  assert.deepEqual(
    result.document.nodes.filter((node) => node.id !== "gateway").map((node) => node.label),
    others,
  );
  const undone = applyOperation(result.document, result.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.document.nodes.find((node) => node.id === "gateway")?.label, "Workspace API");
});

test("applyOperationAt rejects a changed base revision and leaves the document", async () => {
  const document = await load();
  const missed = applyOperationAt(
    document,
    { kind: OPERATION_KIND.SET_TITLE, title: "Stale patch" },
    document.revision + 1,
  );
  assert.equal(missed.ok, false);
  assert.equal(missed.document.title, document.title);
  assert.equal(missed.document.revision, document.revision);
  const applied = applyOperationAt(
    document,
    { kind: OPERATION_KIND.SET_TITLE, title: "Fresh title" },
    document.revision,
  );
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.document.title, "Fresh title");
  assert.equal(applied.document.revision, document.revision + 1);
});

test("rejected edits leave the last valid document in place", async () => {
  const document = await load();
  const result = applyOperation(document, {
    kind: OPERATION_KIND.SET_NODE_LABEL,
    nodeId: "gateway",
    label: "",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.document, document);
  assert.equal(result.document.nodes.find((node) => node.id === "gateway")?.label, "Workspace API");
  assert.equal(result.document.revision, document.revision);
});

test("set_node_kind inverse restores the previous kind", async () => {
  const document = await load();
  const result = applyOperation(document, {
    kind: OPERATION_KIND.SET_NODE_KIND,
    nodeId: "gateway",
    nodeKind: NODE_KIND.SERVICE,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.nodes.find((node) => node.id === "gateway")?.kind, NODE_KIND.SERVICE);
  const undone = applyOperation(result.document, result.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.document.nodes.find((node) => node.id === "gateway")?.kind, NODE_KIND.GATEWAY);
});

test("add_edge records direction and meaning; inverse deletes it", async () => {
  const document = await load();
  const id = nextPrefixedId("e", document.edges.map((edge) => edge.id));
  const result = applyOperation(document, {
    kind: OPERATION_KIND.ADD_EDGE,
    id,
    source: { nodeId: "provider", portId: "out" },
    target: { nodeId: "renderer", portId: "in" },
    type: EDGE_TYPE.CALLS,
    direction: EDGE_DIRECTION.FORWARD,
    label: "render",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const edge = result.document.edges.find((item) => item.id === id);
  assert.equal(edge?.type, "calls");
  assert.equal(edge?.direction, "forward");
  assert.equal(edge?.label, "render");
  const undone = applyOperation(result.document, result.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.document.edges.some((item) => item.id === id), false);
});

test("delete_node removes incident edges and inverse restores them", async () => {
  const document = await load();
  const result = applyOperation(document, { kind: OPERATION_KIND.DELETE_NODE, nodeId: "layout" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.nodes.some((node) => node.id === "layout"), false);
  assert.equal(
    result.document.edges.some(
      (edge) => edge.source.nodeId === "layout" || edge.target.nodeId === "layout",
    ),
    false,
  );
  const undone = applyOperation(result.document, result.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.ok(undone.document.nodes.some((node) => node.id === "layout"));
  assert.ok(
    undone.document.edges.some(
      (edge) => edge.source.nodeId === "layout" || edge.target.nodeId === "layout",
    ),
  );
});

test("duplicate_node copies the node and inverse removes the copy", async () => {
  const document = await load();
  const result = applyOperation(document, {
    kind: OPERATION_KIND.DUPLICATE_NODE,
    nodeId: "gateway",
    newId: "gateway2",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.nodes.find((node) => node.id === "gateway2")?.label, "Workspace API");
  const undone = applyOperation(result.document, result.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.document.nodes.some((node) => node.id === "gateway2"), false);
});

test("set_node_group regroups a node; empty title is rejected", async () => {
  const document = await load();
  const grouped = applyOperation(document, {
    kind: OPERATION_KIND.SET_NODE_GROUP,
    nodeId: "provider",
    groupId: "runtime",
  });
  assert.equal(grouped.ok, true);
  if (!grouped.ok) return;
  assert.equal(grouped.document.nodes.find((node) => node.id === "provider")?.groupId, "runtime");
  const undone = applyOperation(grouped.document, grouped.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.document.nodes.find((node) => node.id === "provider")?.groupId, null);

  const rejected = applyOperation(document, { kind: OPERATION_KIND.SET_TITLE, title: "" });
  assert.equal(rejected.ok, false);
  if (rejected.ok) return;
  assert.equal(rejected.document, document);
});

test("set_node_pinned toggles keep-position and inverse restores it", async () => {
  const document = await load();
  assert.equal(document.layoutHints.pinnedNodeIds.includes("gateway"), true);
  const unpinned = applyOperation(document, {
    kind: OPERATION_KIND.SET_NODE_PINNED,
    nodeId: "gateway",
    pinned: false,
  });
  assert.equal(unpinned.ok, true);
  if (!unpinned.ok) return;
  assert.equal(unpinned.document.layoutHints.pinnedNodeIds.includes("gateway"), false);
  const restored = applyOperation(unpinned.document, unpinned.inverse);
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.equal(restored.document.layoutHints.pinnedNodeIds.includes("gateway"), true);
});

test("set_document_kind converts to workflow and inverse restores dropped nodes", async () => {
  const document = await load();
  const converted = applyOperation(document, {
    kind: OPERATION_KIND.SET_DOCUMENT_KIND,
    documentKind: DOCUMENT_KIND.WORKFLOW,
  });
  assert.equal(converted.ok, true);
  if (!converted.ok) return;
  assert.equal(converted.document.kind, DOCUMENT_KIND.WORKFLOW);
  assert.deepEqual(converted.document.nodes.map((node) => node.id).sort(), ["gateway", "layout"]);
  const undone = applyOperation(converted.document, converted.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.document.kind, DOCUMENT_KIND.ARCHITECTURE);
  assert.deepEqual(
    undone.document.nodes.map((node) => node.id).sort(),
    document.nodes.map((node) => node.id).sort(),
  );
});
