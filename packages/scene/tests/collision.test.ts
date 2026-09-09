import assert from "node:assert/strict";
import test from "node:test";
import { NODE_KIND } from "@mapgrain/document";
import { localOverlapRepair, overlappingIds, rectsOverlap } from "../src/index.ts";
import type { SceneNode } from "../src/types/scene.ts";

function node(id: string, x: number, y: number, width = 120, height = 48): SceneNode {
  return {
    id,
    kind: NODE_KIND.SERVICE,
    kindLabel: { lines: [{ text: "SERVICE", width: 40, height: 14 }], width: 40, height: 14 },
    label: { lines: [{ text: id, width: 80, height: 20 }], width: 80, height: 20 },
    rect: { x, y, width, height },
    ports: [],
    groupId: null,
    iconSize: 16,
  };
}

test("local overlap repair moves the grown node and leaves pinned neighbours", () => {
  const nodes = [node("a", 0, 0, 140, 48), node("b", 80, 0, 120, 48)];
  assert.deepEqual(overlappingIds(nodes, "a"), ["b"]);
  const repair = localOverlapRepair(nodes, "a", ["b"]);
  assert.ok(repair);
  const movedA = repair.a;
  const keptB = repair.b;
  assert.ok(movedA && keptB);
  assert.equal(keptB.x, 80);
  assert.equal(keptB.y, 0);
  assert.equal(
    rectsOverlap({ x: movedA.x, y: movedA.y, width: 140, height: 48 }, { x: keptB.x, y: keptB.y, width: 120, height: 48 }),
    false,
  );
});
