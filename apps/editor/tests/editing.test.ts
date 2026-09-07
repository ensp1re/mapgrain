import assert from "node:assert/strict";
import test from "node:test";
import { EDGE_DIRECTION, EDGE_TYPE, NODE_KIND } from "@mapgrain/document";
import { EXPORT_CHOICE } from "../src/constants/export.ts";
import { directionLabel, relationCaption } from "../src/export/labels.ts";
import { matchesQuery } from "../src/outline/search.ts";
import { outlineTree } from "../src/outline/tree.ts";
import type { FlowNodeDraft } from "../src/types/flow.ts";

const nodes: FlowNodeDraft[] = [
  {
    id: "runtime",
    type: "group",
    position: { x: 0, y: 0 },
    width: 10,
    height: 10,
    data: { label: "Runtime", lines: ["Runtime"], ports: [] },
  },
  {
    id: "api",
    type: "component",
    parentId: "runtime",
    position: { x: 0, y: 0 },
    width: 10,
    height: 10,
    data: { kind: NODE_KIND.SERVICE, label: "API", lines: ["API"], ports: [] },
  },
];

test("search matches node label and kind", () => {
  const api = nodes[1];
  assert.ok(api);
  assert.equal(matchesQuery(api, "api"), true);
  assert.equal(matchesQuery(api, "service"), true);
  assert.equal(matchesQuery(api, "zzz"), false);
});

test("outline tree nests children under groups", () => {
  const tree = outlineTree(nodes);
  assert.equal(tree[0]?.node.id, "runtime");
  assert.equal(tree[0]?.depth, 0);
  assert.equal(tree[1]?.node.id, "api");
  assert.equal(tree[1]?.depth, 1);
});

test("inspector relation captions use human labels", () => {
  const document = {
    nodes: [
      { id: "browser", label: "Browser" },
      { id: "api", label: "API" },
    ],
  } as unknown as Parameters<typeof relationCaption>[0];
  const edge = {
    source: { nodeId: "browser" },
    target: { nodeId: "api" },
    direction: EDGE_DIRECTION.FORWARD,
    type: EDGE_TYPE.CALLS,
  } as unknown as Parameters<typeof relationCaption>[1];
  assert.equal(relationCaption(document, edge), "Browser one way API");
  assert.equal(directionLabel(EDGE_DIRECTION.BOTH), "both ways");
  assert.equal(directionLabel(EDGE_DIRECTION.NONE), "no arrow");
});

test("export dialog offers SVG, PNG, HTML, and JSON", () => {
  assert.deepEqual(Object.values(EXPORT_CHOICE).sort(), ["html", "json", "png", "svg"]);
});
