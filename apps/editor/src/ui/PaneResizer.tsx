import { useCallback, useEffect, useRef, useState } from "react";
import { PANE_WIDTH_MAX, PANE_WIDTH_MIN, PANE_WIDTH_STEP } from "../constants/layout.ts";

interface PaneResizerProps {
  /** Custom property the width is written to, e.g. `--outline-w`. */
  property: string;
  /** Which edge of the pane the handle sits on. */
  edge: "left" | "right";
  label: string;
  defaultWidth: number;
}

function storageKey(property: string): string {
  return `mapgrain.pane${property}`;
}

function readStored(property: string): number | null {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(property));
    const value = raw === null || raw === undefined ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function clamp(width: number): number {
  return Math.min(PANE_WIDTH_MAX, Math.max(PANE_WIDTH_MIN, Math.round(width)));
}

export function PaneResizer({ property, edge, label, defaultWidth }: PaneResizerProps) {
  const handle = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);

  const write = useCallback(
    (width: number) => {
      const next = clamp(width);
      handle.current?.closest<HTMLElement>(".workspace")?.style.setProperty(property, `${next}px`);
      try {
        globalThis.localStorage?.setItem(storageKey(property), String(next));
      } catch {
        // A blocked store only costs the remembered width.
      }
      return next;
    },
    [property],
  );

  useEffect(() => {
    const stored = readStored(property);
    if (stored !== null) write(stored);
  }, [property, write]);

  useEffect(() => {
    if (!dragging) return;
    const pane = handle.current?.parentElement;
    if (!pane) return;
    const onMove = (event: PointerEvent) => {
      const box = pane.getBoundingClientRect();
      write(edge === "right" ? event.clientX - box.left : box.right - event.clientX);
    };
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging, edge, write]);

  const currentWidth = () => handle.current?.parentElement?.getBoundingClientRect().width ?? defaultWidth;

  return (
    <button
      ref={handle}
      type="button"
      className={`pane-resizer is-${edge === "right" ? "right" : "left"}${dragging ? " is-active" : ""}`}
      aria-label={label}
      aria-orientation="vertical"
      role="separator"
      onPointerDown={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDoubleClick={() => write(defaultWidth)}
      onKeyDown={(event) => {
        const grow = edge === "right" ? "ArrowRight" : "ArrowLeft";
        const shrink = edge === "right" ? "ArrowLeft" : "ArrowRight";
        if (event.key !== grow && event.key !== shrink) return;
        event.preventDefault();
        write(currentWidth() + (event.key === grow ? PANE_WIDTH_STEP : -PANE_WIDTH_STEP));
      }}
    />
  );
}
