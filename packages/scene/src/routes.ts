import { CORNER_RADIUS, EDGE_LABEL_CLEARANCE, EDGE_LABEL_PAD } from "./constants/metrics.ts";
import { rectsOverlap } from "./geometry.ts";
import type { Point, Rect } from "./types/geometry.ts";

export function polylinePath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  if (!first) return "";
  return [`M${first.x} ${first.y}`, ...rest.map((point) => `L${point.x} ${point.y}`)].join(" ");
}

export function mapScenePolyline(
  points: Point[],
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): Point[] {
  if (points.length < 2) return [{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }];
  const origin = points[0];
  const last = points[points.length - 1];
  if (!origin || !last) return [{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }];
  const fromDx = last.x - origin.x;
  const fromDy = last.y - origin.y;
  const toDx = targetX - sourceX;
  const toDy = targetY - sourceY;
  return points.map((point) => ({
    x: sourceX + (fromDx === 0 ? point.x - origin.x : ((point.x - origin.x) / fromDx) * toDx),
    y: sourceY + (fromDy === 0 ? point.y - origin.y : ((point.y - origin.y) / fromDy) * toDy),
  }));
}

export function polylineLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return length;
}

export function pointAlongPolyline(points: Point[], distance: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const first = points[0];
  if (!first) return { x: 0, y: 0 };
  if (points.length === 1) return first;
  let remaining = Math.max(0, distance);
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (segment === 0) continue;
    if (remaining <= segment) {
      const t = remaining / segment;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segment;
  }
  return points[points.length - 1] ?? first;
}

const LABEL_FRACTIONS = [0.5, 0.38, 0.62, 0.28, 0.72, 0.2, 0.8] as const;

function labelBoxAt(
  points: Point[],
  size: { width: number; height: number },
  distance: number,
  side: "above" | "below" | "over" | "under",
): { anchor: Point; box: Rect } {
  const along = pointAlongPolyline(points, distance);
  const width = size.width + EDGE_LABEL_PAD * 2;
  const height = size.height + EDGE_LABEL_PAD;
  const close = size.height + EDGE_LABEL_PAD * 2;
  const y =
    side === "above"
      ? along.y - close
      : side === "below"
        ? along.y + EDGE_LABEL_PAD
        : side === "over"
          ? along.y - close - EDGE_LABEL_CLEARANCE
          : along.y + EDGE_LABEL_PAD + EDGE_LABEL_CLEARANCE;
  const box = {
    x: along.x - size.width / 2 - EDGE_LABEL_PAD,
    y,
    width,
    height,
  };
  return { anchor: { x: box.x + box.width / 2, y: box.y + box.height / 2 }, box };
}

function overlapArea(box: Rect, obstacles: readonly Rect[]): number {
  let area = 0;
  for (const obstacle of obstacles) {
    const width = Math.min(box.x + box.width, obstacle.x + obstacle.width) - Math.max(box.x, obstacle.x);
    const height = Math.min(box.y + box.height, obstacle.y + obstacle.height) - Math.max(box.y, obstacle.y);
    if (width > 0 && height > 0) area += width * height;
  }
  return area;
}

export function placeEdgeLabel(
  points: Point[],
  size: { width: number; height: number },
  obstacles: readonly Rect[] = [],
): { anchor: Point; box: Rect } {
  const total = polylineLength(points);
  const inset = Math.min(16, total / 4);
  const clamp = (value: number) => Math.min(Math.max(inset, value), Math.max(0, total - inset));
  if (size.width <= 0 || size.height <= 0 || obstacles.length === 0) {
    return labelBoxAt(points, size, clamp(total * 0.5), "above");
  }
  let best: { anchor: Point; box: Rect } | null = null;
  let bestOverlap = Infinity;
  for (const fraction of LABEL_FRACTIONS) {
    const distance = clamp(total * fraction);
    for (const side of ["above", "over", "below", "under"] as const) {
      const placed = labelBoxAt(points, size, distance, side);
      if (!obstacles.some((obstacle) => rectsOverlap(placed.box, obstacle))) return placed;
      const overlap = overlapArea(placed.box, obstacles);
      if (overlap < bestOverlap) {
        best = placed;
        bestOverlap = overlap;
      }
    }
  }
  return best ?? labelBoxAt(points, size, clamp(total * 0.5), "above");
}

export function roundedPolylinePath(points: Point[], radius = CORNER_RADIUS): string {
  if (points.length === 0) return "";
  const first = points[0];
  if (!first) return "";
  if (points.length < 3) {
    const last = points[points.length - 1] ?? first;
    return `M${first.x} ${first.y} L${last.x} ${last.y}`;
  }
  const parts = [`M${first.x} ${first.y}`];
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    if (!prev || !curr || !next) continue;
    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    if (r < 0.5 || inLen === 0 || outLen === 0) {
      parts.push(`L${curr.x} ${curr.y}`);
      continue;
    }
    const inN = { x: (curr.x - prev.x) / inLen, y: (curr.y - prev.y) / inLen };
    const outN = { x: (next.x - curr.x) / outLen, y: (next.y - curr.y) / outLen };
    parts.push(`L${curr.x - inN.x * r} ${curr.y - inN.y * r}`);
    parts.push(`Q${curr.x} ${curr.y} ${curr.x + outN.x * r} ${curr.y + outN.y * r}`);
  }
  const last = points[points.length - 1];
  if (last) parts.push(`L${last.x} ${last.y}`);
  return parts.join(" ");
}
