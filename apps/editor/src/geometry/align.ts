import { ALIGN_KIND } from "../constants/align.ts";
import type { AlignKind, PositionMap } from "../types/editor.ts";

export function alignPositions(
  positions: PositionMap,
  ids: string[],
  sizes: Record<string, { width: number; height: number }>,
  kind: AlignKind,
): PositionMap {
  const items = ids.flatMap((id) => {
    const pos = positions[id];
    const size = sizes[id];
    return pos && size ? [{ id, pos, size }] : [];
  });
  if (items.length < 2) return positions;
  const next = { ...positions };
  switch (kind) {
    case ALIGN_KIND.LEFT: {
      const x = Math.min(...items.map((item) => item.pos.x));
      for (const item of items) next[item.id] = { ...item.pos, x };
      break;
    }
    case ALIGN_KIND.RIGHT: {
      const right = Math.max(...items.map((item) => item.pos.x + item.size.width));
      for (const item of items) next[item.id] = { ...item.pos, x: right - item.size.width };
      break;
    }
    case ALIGN_KIND.TOP: {
      const y = Math.min(...items.map((item) => item.pos.y));
      for (const item of items) next[item.id] = { ...item.pos, y };
      break;
    }
    case ALIGN_KIND.BOTTOM: {
      const bottom = Math.max(...items.map((item) => item.pos.y + item.size.height));
      for (const item of items) next[item.id] = { ...item.pos, y: bottom - item.size.height };
      break;
    }
    default: {
      const _never: never = kind;
      return _never;
    }
  }
  return next;
}
