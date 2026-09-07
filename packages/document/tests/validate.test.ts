import assert from "node:assert/strict";
import test from "node:test";
import {
  DOCUMENT_KIND,
  NODE_KIND,
  SCHEMA_VERSION,
  VALIDATION_ERROR_CODE,
  validateDocument,
} from "../src/index.ts";
import type { DiagramDocument } from "../src/types/document.ts";

function baseDocument(): DiagramDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: "doc-base",
    revision: 1,
    kind: DOCUMENT_KIND.ARCHITECTURE,
    title: "Base",
    theme: "dark",
    layoutHints: { direction: "right", pinnedNodeIds: [] },
    groups: [],
    nodes: [
      {
        id: "a",
        kind: NODE_KIND.SERVICE,
        label: "A",
        groupId: null,
        ports: [{ id: "out", side: "east" }],
      },
      {
        id: "b",
        kind: NODE_KIND.SERVICE,
        label: "B",
        groupId: null,
        ports: [{ id: "in", side: "west" }],
      },
    ],
    edges: [
      {
        id: "e1",
        source: { nodeId: "a", portId: "out" },
        target: { nodeId: "b", portId: "in" },
        type: "calls",
        direction: "forward",
      },
    ],
    views: [{ id: "overview", kind: "overview", name: "Overview" }],
  };
}

test("valid document is accepted", () => {
  const result = validateDocument(baseDocument());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.id, "doc-base");
    assert.equal(result.document.schemaVersion, 1);
  }
});

test("unsupported schemaVersion is rejected with a dedicated code", () => {
  const input = { ...baseDocument(), schemaVersion: 2 };
  const result = validateDocument(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors[0]?.code, VALIDATION_ERROR_CODE.UNSUPPORTED_SCHEMA_VERSION);
    assert.equal(result.errors[0]?.path, "/schemaVersion");
  }
});

test("schema failures return structured invalid_document errors", () => {
  const result = validateDocument({ schemaVersion: 1, id: "x" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.every((error) => error.code && error.message && error.path));
    assert.ok(
      result.errors.some((error) => error.code === VALIDATION_ERROR_CODE.INVALID_DOCUMENT),
    );
  }
});

test("duplicate ids fail", () => {
  const document = baseDocument();
  document.nodes.push({
    id: "a",
    kind: NODE_KIND.QUEUE,
    label: "Copy",
    groupId: null,
    ports: [],
  });
  const result = validateDocument(document);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.code === VALIDATION_ERROR_CODE.DUPLICATE_ID));
  }
});

test("dangling edge targets fail", () => {
  const document = baseDocument();
  const edge = document.edges[0];
  assert.ok(edge);
  edge.target.nodeId = "missing";
  const result = validateDocument(document);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(
      result.errors.some((error) => error.code === VALIDATION_ERROR_CODE.DANGLING_REFERENCE),
    );
  }
});

test("group parent cycles fail", () => {
  const document = baseDocument();
  document.groups = [
    { id: "g1", label: "One", parentId: "g2" },
    { id: "g2", label: "Two", parentId: "g1" },
  ];
  const result = validateDocument(document);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.code === VALIDATION_ERROR_CODE.GROUP_CYCLE));
  }
});

test("generated contract covers nodes, edges, groups, views, and layout hints", async () => {
  const { DiagramDocumentSchema } = await import("../src/schema/document.ts");
  const keys = Object.keys(DiagramDocumentSchema.properties);
  for (const key of ["nodes", "edges", "groups", "views", "layoutHints"]) {
    assert.ok(keys.includes(key), `missing ${key}`);
  }
});
