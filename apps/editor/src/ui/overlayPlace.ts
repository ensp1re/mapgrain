export const OVERLAY_INSET = 8;
export const OVERLAY_GAP = 4;

export interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export function placeOverlay(
  anchor: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number; offsetTop?: number; offsetLeft?: number },
  align: "start" | "end" = "end",
  matchAnchorWidth = false,
): { top: number; left: number; width: number; maxHeight: number } {
  const inset = OVERLAY_INSET;
  const offsetTop = viewport.offsetTop ?? 0;
  const offsetLeft = viewport.offsetLeft ?? 0;
  const width = matchAnchorWidth
    ? Math.min(Math.max(size.width, anchor.width), Math.max(inset * 2, viewport.width - inset * 2))
    : Math.min(size.width, Math.max(inset * 2, viewport.width - inset * 2));
  const maxHeight = Math.max(48, viewport.height - inset * 2);
  let top = anchor.bottom + OVERLAY_GAP;
  let left = align === "end" ? anchor.right - width : anchor.left;
  if (top + Math.min(size.height, maxHeight) > offsetTop + viewport.height - inset) {
    top = Math.max(offsetTop + inset, anchor.top - Math.min(size.height, maxHeight) - OVERLAY_GAP);
  }
  top = Math.min(Math.max(top, offsetTop + inset), offsetTop + viewport.height - inset - 48);
  left = Math.min(Math.max(left, offsetLeft + inset), offsetLeft + viewport.width - inset - width);
  return { top, left, width, maxHeight };
}
