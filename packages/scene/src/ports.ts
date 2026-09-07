import { PORT_SIDE, type PortSide } from "@mapgrain/document";
import type { Point, Rect } from "./types/geometry.ts";
import type { ScenePort } from "./types/scene.ts";

export function pointOnSide(rect: Rect, side: PortSide, t: number): Point {
  const clamped = Math.min(1, Math.max(0, t));
  switch (side) {
    case PORT_SIDE.NORTH:
      return { x: rect.x + rect.width * clamped, y: rect.y };
    case PORT_SIDE.SOUTH:
      return { x: rect.x + rect.width * clamped, y: rect.y + rect.height };
    case PORT_SIDE.WEST:
      return { x: rect.x, y: rect.y + rect.height * clamped };
    case PORT_SIDE.EAST:
      return { x: rect.x + rect.width, y: rect.y + rect.height * clamped };
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }
}

export function facingSide(from: Rect, to: Rect): PortSide {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? PORT_SIDE.EAST : PORT_SIDE.WEST;
  return dy >= 0 ? PORT_SIDE.SOUTH : PORT_SIDE.NORTH;
}

export function portOffset(port: ScenePort, rect: Rect): Point {
  return { x: port.x - rect.x, y: port.y - rect.y };
}

export function placePortsOnRect(
  nodeId: string,
  rect: Rect,
  ports: Array<{ id: string; side: PortSide }>,
): ScenePort[] {
  const bySide = new Map<PortSide, Array<{ id: string; side: PortSide }>>();
  for (const port of ports) {
    const list = bySide.get(port.side) ?? [];
    list.push(port);
    bySide.set(port.side, list);
  }
  const placed: ScenePort[] = [];
  for (const side of Object.values(PORT_SIDE)) {
    const list = bySide.get(side) ?? [];
    list.forEach((port, index) => {
      const t = (index + 1) / (list.length + 1);
      const point = pointOnSide(rect, side, t);
      placed.push({ id: port.id, nodeId, side, x: point.x, y: point.y });
    });
  }
  return placed;
}

export function synthesizedPortId(nodeId: string, side: PortSide): string {
  return `${nodeId}:${side}`;
}
