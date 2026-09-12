import assert from "node:assert/strict";
import test from "node:test";
import { DOCUMENT_KIND, NODE_KIND, OPERATION_KIND, applyOperation } from "@mapgrain/document";
import { buildScene, rectsOverlap } from "@mapgrain/scene";
import { blankDocument } from "../src/create/blank.ts";
import { makeNode } from "../src/create/nodes.ts";
import { freeSpotNear, groupForNewNode } from "../src/edit/placement.ts";
import type { PositionMap } from "../src/types/editor.ts";

function withNodes(count: number): { document: ReturnType<typeof blankDocument>; positions: PositionMap } {
  let document = blankDocument(DOCUMENT_KIND.ARCHITECTURE);
  const positions: PositionMap = {};
  for (let index = 0; index < count; index += 1) {
    const id = `n${index}`;
    const result = applyOperation(document, {
      kind: OPERATION_KIND.ADD_NODE,
      node: makeNode(id, NODE_KIND.SERVICE, `Service ${index}`),
    });
    assert.equal(result.ok, true);
    if (!result.ok) break;
    document = result.document;
    positions[id] = freeSpotNear(document, positions, { x: 0, y: 0 });
  }
  return { document, positions };
}

test("a new node lands near the viewport centre when the canvas is empty", () => {
  const document = blankDocument(DOCUMENT_KIND.ARCHITECTURE);
  const spot = freeSpotNear(document, {}, { x: 480, y: 260 });
  assert.ok(Math.abs(spot.x - 480) < 200, `x ${spot.x}`);
  assert.ok(Math.abs(spot.y - 260) < 200, `y ${spot.y}`);
});

test("nodes added in a row never land on top of each other", () => {
  const { document, positions } = withNodes(8);
  const scene = buildScene(document, { positions });
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  for (const node of scene.scene.nodes) {
    for (const other of scene.scene.nodes) {
      if (node.id === other.id) continue;
      assert.equal(rectsOverlap(node.rect, other.rect), false, `${node.id} overlaps ${other.id}`);
    }
  }
});

test("a new node joins the group of the current selection", () => {
  let document = blankDocument(DOCUMENT_KIND.WORKFLOW);
  const added = applyOperation(document, { kind: OPERATION_KIND.ADD_GROUP, id: "lane", label: "Lane" });
  assert.equal(added.ok, true);
  if (!added.ok) return;
  document = added.document;
  const withNode = applyOperation(document, {
    kind: OPERATION_KIND.ADD_NODE,
    node: { ...makeNode("j1", NODE_KIND.JOB, "Job"), groupId: "lane" },
  });
  assert.equal(withNode.ok, true);
  if (!withNode.ok) return;
  assert.equal(groupForNewNode(withNode.document, "j1"), "lane");
  assert.equal(groupForNewNode(withNode.document, "lane"), "lane");
  assert.equal(groupForNewNode(withNode.document, undefined), null);
});

test("sequence participants never inherit a group", () => {
  const document = blankDocument(DOCUMENT_KIND.SEQUENCE);
  assert.equal(groupForNewNode(document, "anything"), null);
});
