import { rectsOverlap } from "../geometry.ts";
import { PORT_SIDE, type PortSide } from "@mapgrain/document";
import {
  EDGE_STUB,
  ROUTE_BREATHING_ROOM,
  ROUTE_CHANNEL_STEP,
  ROUTE_CHANNEL_TRIES,
  ROUTE_CLEARANCE,
} from "../constants/metrics.ts";
import type { Point, Rect } from "../types/geometry.ts";

export interface RouteRequest {
  source: { rect: Rect; point: Point; side: PortSide };
  target: { rect: Rect; point: Point; side: PortSide };
  /** Every other node rectangle the route should not cross. */
  obstacles: Rect[];
  /** Routes already drawn. Crossing one is allowed; running along it is not. */
  drawn?: Point[][];
  /** Index and count among edges sharing this node pair, so parallels take separate channels. */
  index: number;
  count: number;
}

function isVertical(side: PortSide): boolean {
  return side === PORT_SIDE.NORTH || side === PORT_SIDE.SOUTH;
}

/** One node-width step away from the card, in the direction the port faces. */
function stubPoint(point: Point, side: PortSide): Point {
  if (side === PORT_SIDE.NORTH) return { x: point.x, y: point.y - EDGE_STUB };
  if (side === PORT_SIDE.SOUTH) return { x: point.x, y: point.y + EDGE_STUB };
  if (side === PORT_SIDE.WEST) return { x: point.x - EDGE_STUB, y: point.y };
  return { x: point.x + EDGE_STUB, y: point.y };
}

/** Collapses runs of collinear points so a straight run stays a single segment. */
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out.at(-1);
    if (last && Math.abs(last.x - point.x) < 0.5 && Math.abs(last.y - point.y) < 0.5) continue;
    out.push(point);
  }
  const kept: Point[] = [];
  for (const [index, point] of out.entries()) {
    const before = kept.at(-1);
    const after = out[index + 1];
    if (!before || !after) {
      kept.push(point);
      continue;
    }
    const collinearX = Math.abs(before.x - point.x) < 0.5 && Math.abs(point.x - after.x) < 0.5;
    const collinearY = Math.abs(before.y - point.y) < 0.5 && Math.abs(point.y - after.y) < 0.5;
    if (collinearX || collinearY) continue;
    kept.push(point);
  }
  return kept;
}

/** The band a segment claims: the clearance is kept on each side, not split between them. */
function segmentRect(a: Point, b: Point, clearance = ROUTE_CLEARANCE): Rect {
  return {
    x: Math.min(a.x, b.x) - clearance,
    y: Math.min(a.y, b.y) - clearance,
    width: Math.abs(a.x - b.x) + clearance * 2,
    height: Math.abs(a.y - b.y) + clearance * 2,
  };
}

/** How much of the route runs through something it does not start or end on. */
export function routeCost(points: Point[], obstacles: Rect[]): number {
  let hits = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const first = points[index];
    const second = points[index + 1];
    if (!first || !second) continue;
    const box = segmentRect(first, second);
    for (const obstacle of obstacles) {
      if (rectsOverlap(box, obstacle)) hits += 1;
    }
  }
  return hits;
}

/**
 * How close the route comes to anything it does not touch, as a penalty. Two candidates can
 * both be clear; this is what makes the router take the roomier one instead of the first it
 * happens to try.
 */
function routeTightness(points: Point[], obstacles: Rect[]): number {
  let tight = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const first = points[index];
    const second = points[index + 1];
    if (!first || !second) continue;
    for (const obstacle of obstacles) {
      if (rectsOverlap(segmentRect(first, second, ROUTE_BREATHING_ROOM), obstacle)) tight += 1;
    }
  }
  return tight;
}

/**
 * Right-angled candidates between two stubs. The channel is the shared coordinate the route
 * turns on; shifting it is how the router steps around a card that sits in the way.
 */
function candidates(from: Point, to: Point, fromSide: PortSide, toSide: PortSide, shift: number): Point[][] {
  const vertical = isVertical(fromSide);
  const verticalEnd = isVertical(toSide);
  const midY = (from.y + to.y) / 2 + shift;
  const midX = (from.x + to.x) / 2 + shift;

  if (vertical && verticalEnd) {
    return [[from, { x: from.x, y: midY }, { x: to.x, y: midY }, to]];
  }
  if (!vertical && !verticalEnd) {
    return [[from, { x: midX, y: from.y }, { x: midX, y: to.y }, to]];
  }
  // One end runs vertically and the other horizontally: a single corner does it, and the
  // corner can sit on either axis.
  if (vertical) {
    return [
      [from, { x: from.x, y: to.y }, to],
      [from, { x: from.x, y: midY }, { x: to.x + shift, y: midY }, { x: to.x + shift, y: to.y }, to],
    ];
  }
  return [
    [from, { x: to.x, y: from.y }, to],
    [from, { x: midX, y: from.y }, { x: midX, y: to.y + shift }, { x: to.x, y: to.y + shift }, to],
  ];
}

/**
 * An orthogonal route between two ports.
 *
 * Edges used to be drawn as a straight line from port to port, which cut diagonally across
 * whatever sat between — the single biggest reason a diagram read as noise. This leaves each
 * card perpendicular to its port, turns in the channel between the two, and steps that channel
 * aside when a card is in the way.
 */
/** The bands already-drawn routes occupy, so a later route does not run along one of them. */
function drawnBands(drawn: Point[][]): Rect[] {
  const bands: Rect[] = [];
  for (const points of drawn) {
    for (let index = 0; index + 1 < points.length; index += 1) {
      const first = points[index];
      const second = points[index + 1];
      if (!first || !second) continue;
      const run = Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
      // A stub is too short to be worth avoiding, and avoiding it would push every route off
      // the side it is supposed to leave from.
      if (run <= EDGE_STUB * 2) continue;
      bands.push(segmentRect(first, second, ROUTE_CHANNEL_STEP / 2));
    }
  }
  return bands;
}

export function routeOrthogonal(request: RouteRequest): Point[] {
  const { source, target, obstacles, index, count } = request;
  // Overlapping a card is a real fault; overlapping another route is only a preference, so
  // the two are scored separately.
  const crowd = [...obstacles, ...drawnBands(request.drawn ?? [])];
  const start = source.point;
  const end = target.point;
  const fromStub = stubPoint(start, source.side);
  const toStub = stubPoint(end, target.side);

  // Parallel edges take neighbouring channels so they never coincide.
  const spread = count > 1 ? (index - (count - 1) / 2) * ROUTE_CHANNEL_STEP : 0;

  // A straight run between two aligned ports ignores the channel, so several edges over the
  // same pair would land on the same line. Jog the middle of the run instead.
  if (spread !== 0) {
    const alongX = Math.abs(fromStub.y - toStub.y) < 0.5;
    const alongY = Math.abs(fromStub.x - toStub.x) < 0.5;
    if (alongX) {
      const y = fromStub.y + spread;
      return simplify([start, fromStub, { x: fromStub.x, y }, { x: toStub.x, y }, toStub, end]);
    }
    if (alongY) {
      const x = fromStub.x + spread;
      return simplify([start, fromStub, { x, y: fromStub.y }, { x, y: toStub.y }, toStub, end]);
    }
  }

  let best: Point[] | null = null;
  let bestCost = Number.POSITIVE_INFINITY;
  let bestTight = Number.POSITIVE_INFINITY;
  const consider = (middle: Point[]) => {
    const points = simplify([start, ...middle, end]);
    const cost = routeCost(points, obstacles);
    const tight = cost === 0 ? routeTightness(points, crowd) : Number.POSITIVE_INFINITY;
    if (cost < bestCost || (cost === bestCost && tight < bestTight)) {
      best = points;
      bestCost = cost;
      bestTight = tight;
    }
    return cost === 0 && tight === 0 ? points : null;
  };

  for (let attempt = 0; attempt <= ROUTE_CHANNEL_TRIES; attempt += 1) {
    const step =
      attempt === 0 ? 0 : Math.ceil(attempt / 2) * ROUTE_CHANNEL_STEP * (attempt % 2 === 0 ? -1 : 1);
    for (const middle of candidates(fromStub, toStub, source.side, target.side, spread + step)) {
      const clear = consider(middle);
      if (clear) return clear;
    }
  }

  // Nothing in the direct channel is clear, so go around: turn outside the blocking band
  // rather than through it.
  const span = obstacles.reduce(
    (box, rect) => ({
      top: Math.min(box.top, rect.y),
      bottom: Math.max(box.bottom, rect.y + rect.height),
      left: Math.min(box.left, rect.x),
      right: Math.max(box.right, rect.x + rect.width),
    }),
    { top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity },
  );
  const detours: Point[][] = [];
  if (Number.isFinite(span.top)) {
    for (const y of [span.top - EDGE_STUB, span.bottom + EDGE_STUB]) {
      detours.push([fromStub, { x: fromStub.x, y }, { x: toStub.x, y }, toStub]);
    }
    for (const x of [span.left - EDGE_STUB, span.right + EDGE_STUB]) {
      detours.push([fromStub, { x, y: fromStub.y }, { x, y: toStub.y }, toStub]);
    }
  }
  for (const middle of detours) {
    const clear = consider(middle);
    if (clear) return clear;
  }
  return best ?? simplify([start, fromStub, toStub, end]);
}
