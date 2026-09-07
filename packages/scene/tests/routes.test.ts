import assert from "node:assert/strict";
import test from "node:test";
import { mapScenePolyline, polylinePath } from "../src/index.ts";

test("canonical polyline path is built from scene points", () => {
  const path = polylinePath([
    { x: 0, y: 0 },
    { x: 10, y: 4 },
    { x: 20, y: 0 },
  ]);
  assert.equal(path, "M0 0 L10 4 L20 0");
  const mapped = mapScenePolyline(
    [
      { x: 0, y: 0 },
      { x: 10, y: 4 },
      { x: 20, y: 0 },
    ],
    100,
    50,
    140,
    50,
  );
  assert.equal(mapped[0]?.x, 100);
  assert.equal(mapped.at(-1)?.x, 140);
  assert.ok((mapped[1]?.y ?? 0) > 50);
});
