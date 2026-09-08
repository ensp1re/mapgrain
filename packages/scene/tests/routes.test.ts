import assert from "node:assert/strict";
import test from "node:test";
import {
  mapScenePolyline,
  placeEdgeLabel,
  pointAlongPolyline,
  polylineLength,
  polylinePath,
  roundedPolylinePath,
} from "../src/index.ts";

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

test("edge labels sit at half the path length, not the middle vertex", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 10 },
  ];
  const total = polylineLength(points);
  assert.equal(total, 110);
  const midVertex = points[Math.floor(points.length / 2)];
  const placed = placeEdgeLabel(points, { width: 20, height: 10 });
  const along = pointAlongPolyline(points, total * 0.5);
  assert.ok(Math.abs(along.x - 55) < 1e-6);
  assert.ok(Math.abs(along.y) < 1e-6);
  assert.notEqual(placed.anchor.x, midVertex?.x);
  assert.ok(Math.abs(placed.anchor.x - along.x) < 1);
});

test("rounded orthogonal paths use quadratic corners capped by segment length", () => {
  const path = roundedPolylinePath(
    [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ],
    8,
  );
  assert.match(path, /^M0 0 L12 0 Q20 0 20 8 L20 20$/);
  const short = roundedPolylinePath(
    [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 6 },
    ],
    8,
  );
  assert.match(short, /Q6 0 6 3/);
});
