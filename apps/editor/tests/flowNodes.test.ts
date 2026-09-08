import assert from "node:assert/strict";
import test from "node:test";
import type { Node } from "@xyflow/react";
import { reuseUnchangedEdges, reuseUnchangedNodes, sameNodeContent } from "../src/edit/flowNodes.ts";
import type { Edge } from "@xyflow/react";

function node(id: string, extra: Partial<Node> = {}): Node {
  return {
    id,
    type: "component",
    position: { x: 1, y: 2 },
    data: { label: "A", editing: false, kind: "service" },
    selected: false,
    ...extra,
  };
}

test("reuseUnchangedNodes keeps the previous object when content is equal", () => {
  const first = [node("n1")];
  const second = [node("n1", { data: { label: "A", editing: false, kind: "service", onStartEdit: () => undefined } })];
  const reused = reuseUnchangedNodes(first, second);
  assert.equal(reused, first);
  assert.equal(reused[0], first[0]);
});

test("reuseUnchangedNodes replaces a node when its label or selection changes", () => {
  const first = [node("n1")];
  const next = reuseUnchangedNodes(first, [node("n1", { selected: true })]);
  assert.notEqual(next[0], first[0]);
  assert.equal(next[0]?.selected, true);
  assert.equal(sameNodeContent(first[0]!, node("n1")), true);
});

test("reuseUnchangedEdges keeps the previous object when content is equal", () => {
  const first: Edge[] = [
    { id: "e1", source: "a", target: "b", selected: false, data: { label: "calls", type: "calls", direction: "forward" } },
  ];
  const second: Edge[] = [
    { id: "e1", source: "a", target: "b", selected: false, data: { label: "calls", type: "calls", direction: "forward" } },
  ];
  const reused = reuseUnchangedEdges(first, second);
  assert.equal(reused, first);
  assert.equal(reused[0], first[0]);
});
