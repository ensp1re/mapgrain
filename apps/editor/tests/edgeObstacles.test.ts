import assert from "node:assert/strict";
import test from "node:test";
import type { Node } from "@xyflow/react";
import { captionLabelSize, flowComponentObstacles } from "../src/diagram/edgeObstacles.ts";

function node(
  id: string,
  type: "component" | "group",
  position: { x: number; y: number },
  extra: Partial<Node> = {},
): Node {
  return { id, type, position, data: {}, ...extra };
}

test("component obstacles use absolute coordinates inside groups", () => {
  const nodes: Node[] = [
    node("runtime", "group", { x: 10, y: 20 }, { width: 400, height: 200, style: { width: 400, height: 200 } }),
    node("api", "component", { x: 30, y: 40 }, {
      parentId: "runtime",
      width: 80,
      height: 36,
      style: { width: 80, height: 36 },
    }),
  ];
  assert.deepEqual(flowComponentObstacles(nodes), [{ x: 32, y: 52, width: 96, height: 52 }]);
});

test("caption size prefers measured text and estimates otherwise", () => {
  assert.deepEqual(captionLabelSize("writes", { width: 52, height: 16 }), { width: 52, height: 16 });
  assert.deepEqual(captionLabelSize("calls"), { width: 47, height: 16 });
  assert.deepEqual(captionLabelSize(""), { width: 0, height: 0 });
});
