import { rectsOverlap } from "./geometry.ts";
import type { Point, Rect } from "./types/geometry.ts";
import type { SceneNode } from "./types/scene.ts";

const GAP = 8;

export function overlappingIds(nodes: SceneNode[], nodeId: string): string[] {
  const grown = nodes.find((node) => node.id === nodeId);
  if (!grown) return [];
  return nodes
    .filter((node) => node.id !== nodeId && rectsOverlap(grown.rect, node.rect))
    .map((node) => node.id);
}

function separate(grown: Rect, other: Rect): Point {
  const overlapX = Math.min(grown.x + grown.width, other.x + other.width) - Math.max(grown.x, other.x);
  const overlapY = Math.min(grown.y + grown.height, other.y + other.height) - Math.max(grown.y, other.y);
  if (overlapX <= overlapY) {
    const moveRight = grown.x + grown.width / 2 <= other.x + other.width / 2;
    return moveRight
      ? { x: other.x - grown.width - GAP, y: grown.y }
      : { x: other.x + other.width + GAP, y: grown.y };
  }
  const moveUp = grown.y + grown.height / 2 <= other.y + other.height / 2;
  return moveUp
    ? { x: grown.x, y: other.y - grown.height - GAP }
    : { x: grown.x, y: other.y + other.height + GAP };
}

export function localOverlapRepair(
  nodes: SceneNode[],
  grownId: string,
  pinnedIds: Iterable<string> = [],
): Record<string, Point> | null {
  const grown = nodes.find((node) => node.id === grownId);
  if (!grown) return null;
  const pinned = new Set(pinnedIds);
  const next = new Map(nodes.map((node) => [node.id, { ...node.rect }]));
  let changed = false;
  for (const other of nodes) {
    if (other.id === grownId) continue;
    const current = next.get(grownId);
    const neighbor = next.get(other.id);
    if (!current || !neighbor) continue;
    if (!rectsOverlap(current, neighbor)) continue;
    changed = true;
    if (!pinned.has(grownId)) {
      const moved = separate(current, neighbor);
      next.set(grownId, { ...current, x: moved.x, y: moved.y });
    } else if (!pinned.has(other.id)) {
      const moved = separate(neighbor, current);
      next.set(other.id, { ...neighbor, x: moved.x, y: moved.y });
    } else {
      const moved = separate(current, neighbor);
      next.set(grownId, { ...current, x: moved.x, y: moved.y });
    }
  }
  if (!changed) return null;
  return Object.fromEntries([...next.entries()].map(([id, rect]) => [id, { x: rect.x, y: rect.y }]));
}
