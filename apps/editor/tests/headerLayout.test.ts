import assert from "node:assert/strict";
import test from "node:test";
import {
  HEADER_LAYOUT,
  headerLayoutFor,
  headerShowsArrange,
  headerShowsHistory,
  headerShowsPresent,
  stabilizeHeaderLayout,
} from "../src/chrome/headerLayout.ts";
import { placeOverlay } from "../src/ui/overlayPlace.ts";

test("header layouts collapse Present then Arrange then history", () => {
  assert.equal(headerLayoutFor(1440), HEADER_LAYOUT.FULL);
  assert.equal(headerShowsHistory(HEADER_LAYOUT.FULL), true);
  assert.equal(headerShowsPresent(HEADER_LAYOUT.REGULAR), true);
  assert.equal(headerShowsArrange(HEADER_LAYOUT.COMPACT), true);
  assert.equal(headerShowsArrange(HEADER_LAYOUT.PHONE), false);
  assert.equal(headerShowsPresent(HEADER_LAYOUT.COMPACT), false);
});

test("header layout hysteresis ignores jitter around a threshold", () => {
  assert.equal(stabilizeHeaderLayout(800, HEADER_LAYOUT.COMPACT), HEADER_LAYOUT.COMPACT);
  assert.equal(stabilizeHeaderLayout(1080, HEADER_LAYOUT.REGULAR), HEADER_LAYOUT.REGULAR);
  assert.equal(stabilizeHeaderLayout(400, HEADER_LAYOUT.FULL), HEADER_LAYOUT.PHONE);
});

test("overlay placement stays 8px inside the viewport", () => {
  const placed = placeOverlay(
    { top: 40, left: 1200, right: 1280, bottom: 72, width: 80, height: 32 },
    { width: 220, height: 280 },
    { width: 390, height: 844 },
    "end",
  );
  assert.ok(placed.left >= 8);
  assert.ok(placed.left + placed.width <= 390 - 8);
  assert.ok(placed.top >= 8);
});
