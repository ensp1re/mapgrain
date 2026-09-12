import assert from "node:assert/strict";
import test from "node:test";
import {
  mapScenePolyline,
  placeEdgeLabel,
  pointAlongPolyline,
  polylineLength,
  polylinePath,
  rectsOverlap,
  edgePath,
  roundedPolylinePath,
} from "../src/index.ts";
import { EDGE_SHAPE } from "@mapgrain/document";

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

test("edge labels slide off a node that covers the midpoint", () => {
  const points = [
    { x: 0, y: 40 },
    { x: 200, y: 40 },
  ];
  const size = { width: 24, height: 10 };
  const obstacle = { x: 80, y: 20, width: 40, height: 30 };
  const blocked = placeEdgeLabel(points, size, [obstacle]);
  const clear = placeEdgeLabel(points, size);
  assert.notDeepEqual(blocked.box, clear.box);
  assert.equal(rectsOverlap(blocked.box, obstacle), false);
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

test("every line shape draws a path through the points the scene routed", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 60 },
    { x: 90, y: 60 },
  ];
  const elbow = edgePath(points, EDGE_SHAPE.ELBOW);
  const straight = edgePath(points, EDGE_SHAPE.STRAIGHT);
  const curved = edgePath(points, EDGE_SHAPE.CURVED);

  for (const path of [elbow, straight, curved]) {
    assert.match(path, /^M0 0/, path);
    assert.ok(path.includes("90"), `${path} must reach the target`);
  }
  // A straight line is two points; the others keep the detour the router found.
  assert.equal(straight, "M0 0 L90 60");
  assert.ok(curved.startsWith("M0 0 C"), curved);
  assert.equal(curved.includes("L"), false, "a curve has no straight segments");
  assert.ok(elbow.includes("Q"), elbow);
  assert.equal(edgePath(points), elbow, "elbow is the default");
});

test("a curve with fewer than three points is just the line between them", () => {
  const two = [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
  ];
  assert.equal(edgePath(two, EDGE_SHAPE.CURVED), "M0 0 L10 10");
  assert.equal(edgePath([], EDGE_SHAPE.CURVED), "");
});
