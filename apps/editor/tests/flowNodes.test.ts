import assert from "node:assert/strict";
import test from "node:test";
import type { Node } from "@xyflow/react";
import {
  portSignature,
  reuseUnchangedEdges,
  reuseUnchangedNodes,
  sameEdgeContent,
  sameNodeContent,
} from "../src/edit/flowNodes.ts";
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

test("reuseUnchangedNodes replaces a node when kind fill changes", () => {
  const first = [node("n1", { data: { label: "A", editing: false, kind: "gateway", kindFill: "gateway" } })];
  const next = reuseUnchangedNodes(first, [
    node("n1", { data: { label: "A", editing: false, kind: "gateway" } }),
  ]);
  assert.notEqual(next[0], first[0]);
  assert.equal((next[0]?.data as { kindFill?: string }).kindFill, undefined);
});

test("reuseUnchangedNodes keeps measured size when only selection changes", () => {
  const first = [node("n1", { measured: { width: 180, height: 72 }, width: 180, height: 72 })];
  const next = reuseUnchangedNodes(first, [node("n1", { selected: true })]);
  assert.equal(next[0]?.selected, true);
  assert.deepEqual(next[0]?.measured, { width: 180, height: 72 });
  assert.equal(next[0]?.width, 180);
  assert.equal(next[0]?.height, 72);
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

test("a node whose ports changed is not reused, so its handles are rebuilt", () => {
  const ports = (ids: string[]) =>
    ids.map((id) => ({ id, side: "east", asSource: true, asTarget: false }));
  const before = [
    { id: "n1", type: "component", position: { x: 0, y: 0 }, data: { label: "A", ports: ports(["out"]) } },
  ] as unknown as Node[];
  const after = [
    {
      id: "n1",
      type: "component",
      position: { x: 0, y: 0 },
      data: { label: "A", ports: ports(["out", "n1:south"]) },
    },
  ] as unknown as Node[];
  const reused = reuseUnchangedNodes(before, after);
  assert.notEqual(reused[0], before[0], "a new port must produce a new node object");
  assert.equal(portSignature(reused[0]?.data), portSignature(after[0]?.data));
  // The same ports still reuse the previous object.
  assert.equal(reuseUnchangedNodes(before, structuredClone(before))[0], before[0]);
});

test("hiding an item is a change, so the canvas stops drawing it", () => {
  const shown: Node = { id: "n1", type: "component", position: { x: 0, y: 0 }, data: { label: "A" } };
  const gone: Node = { ...shown, hidden: true };
  assert.equal(sameNodeContent(shown, gone), false);
  assert.equal(reuseUnchangedNodes([shown], [gone])[0]?.hidden, true);
  assert.equal(reuseUnchangedNodes([gone], [shown])[0]?.hidden, undefined);

  const edge: Edge = { id: "e1", source: "n1", target: "n2" };
  assert.equal(sameEdgeContent(edge, { ...edge, hidden: true }), false);
  assert.equal(reuseUnchangedEdges([edge], [{ ...edge, hidden: true }])[0]?.hidden, true);
});

test("a connection whose route or caption anchor moved is not reused", () => {
  const at = (points: Array<{ x: number; y: number }>, anchor: { x: number; y: number }): Edge => ({
    id: "e1",
    source: "a",
    target: "b",
    data: { label: "calls", type: "calls", direction: "forward", caption: "calls", points, labelAnchor: anchor },
  });
  const first = at([{ x: 0, y: 0 }, { x: 40, y: 0 }], { x: 20, y: -10 });

  // Arrange moves the cards. The ends, the label and the handles are all unchanged, so every
  // other field matches and only the geometry says the edge has to be redrawn.
  const moved = at([{ x: 0, y: 90 }, { x: 40, y: 90 }], { x: 20, y: 80 });
  assert.equal(sameEdgeContent(first, moved), false);
  assert.equal(reuseUnchangedEdges([first], [moved])[0], moved);

  // The caption alone can move when a neighbour's caption is placed first.
  const nudged = at([{ x: 0, y: 0 }, { x: 40, y: 0 }], { x: 20, y: 14 });
  assert.equal(sameEdgeContent(first, nudged), false);

  // Identical geometry is still reused, so a redraw is not forced every render.
  assert.equal(sameEdgeContent(first, at([{ x: 0, y: 0 }, { x: 40, y: 0 }], { x: 20, y: -10 })), true);
});
