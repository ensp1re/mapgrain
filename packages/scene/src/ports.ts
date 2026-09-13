import { PORT_SIDE, type PortSide } from "@mapgrain/document";
import { PORT_MIN_GAP } from "./constants/metrics.ts";
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

/**
 * Which vertex a branch leaves a decision by.
 *
 * A gateway's alternatives are meant to leave by *different* vertices — the continuing path
 * straight on, the alternatives up and down — so a reader can tell them apart at the diamond
 * rather than where they end. Sending them all out of the side that merely happens to face the
 * target puts both branches on the same point, and the reader has to trace two lines that
 * start in the same place. Anything level with the diamond keeps the forward vertex.
 */
export function branchSide(from: Rect, to: Rect): PortSide {
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  if (Math.abs(dy) <= from.height / 2) return facingSide(from, to);
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
    // Evenly spreading over the whole side puts four ports 14px apart on a 72px card, closer
    // than one routing channel, so the lines leaving them run into each other. Keep at least a
    // channel between ports and centre the group when the side is too short to hold them all.
    const span = side === PORT_SIDE.NORTH || side === PORT_SIDE.SOUTH ? rect.width : rect.height;
    const even = span / (list.length + 1);
    const step = Math.max(even, PORT_MIN_GAP);
    const used = step * (list.length - 1);
    list.forEach((port, index) => {
      const t = list.length === 1 ? 0.5 : (span / 2 - used / 2 + index * step) / span;
      const point = pointOnSide(rect, side, Math.min(1, Math.max(0, t)));
      placed.push({ id: port.id, nodeId, side, x: point.x, y: point.y });
    });
  }
  return placed;
}

export function synthesizedPortId(nodeId: string, side: PortSide): string {
  return `${nodeId}:${side}`;
}
