import type { Point } from "./types/geometry.ts";

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
