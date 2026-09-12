import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../chrome/focusTrap.ts";
import { placeOverlay, type Box } from "./overlayPlace.ts";

export type OverlayPattern = "menu" | "listbox" | "dialog";

interface OverlayProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  align?: "start" | "end";
  role?: string;
  label?: string;
  pattern?: OverlayPattern;
  matchAnchorWidth?: boolean;
}

function viewportBox(): { width: number; height: number; offsetTop: number; offsetLeft: number } {
  const view = window.visualViewport;
  if (view) {
    return {
      width: view.width,
      height: view.height,
      offsetTop: view.offsetTop,
      offsetLeft: view.offsetLeft,
    };
  }
  return { width: window.innerWidth, height: window.innerHeight, offsetTop: 0, offsetLeft: 0 };
}

function itemSelector(pattern: OverlayPattern): string {
  if (pattern === "listbox") return '[role="option"]';
  if (pattern === "menu") return '[role="menuitem"]:not([disabled])';
  return "button:not([disabled]), [href], input:not([disabled])";
}

export function Overlay({
  open,
  anchorRef,
  onClose,
  children,
  align = "end",
  role,
  label,
  pattern = "menu",
  matchAnchorWidth = false,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const trap = pattern === "dialog";
  useFocusTrap(panelRef, trap && open, onClose);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const place = () => {
      const a = anchor.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      const box: Box = { top: a.top, left: a.left, right: a.right, bottom: a.bottom, width: a.width, height: a.height };
      const next = placeOverlay(box, { width: p.width, height: p.height }, viewportBox(), align, matchAnchorWidth);
      panel.style.top = `${next.top}px`;
      panel.style.left = `${next.left}px`;
      panel.style.width = matchAnchorWidth ? `${next.width}px` : "";
      panel.style.maxHeight = `${next.maxHeight}px`;
    };
    place();
    const view = window.visualViewport;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    view?.addEventListener("resize", place);
    view?.addEventListener("scroll", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      view?.removeEventListener("resize", place);
      view?.removeEventListener("scroll", place);
    };
  }, [align, anchorRef, matchAnchorWidth, open]);

  useEffect(() => {
    if (!open || trap) return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = () => [...panel.querySelectorAll<HTMLElement>(itemSelector(pattern))];
    const selected = panel.querySelector<HTMLElement>('[aria-selected="true"], [aria-checked="true"]');
    (selected ?? items()[0])?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        anchorRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        onClose();
        anchorRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
        return;
      }
      const list = items();
      if (list.length === 0) return;
      event.preventDefault();
      const current = list.indexOf(document.activeElement as HTMLElement);
      let next = 0;
      if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % list.length;
      if (event.key === "ArrowUp") next = current < 0 ? list.length - 1 : (current - 1 + list.length) % list.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = list.length - 1;
      list[next]?.focus();
    };
    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, [anchorRef, onClose, open, pattern, trap]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      // A menu or listbox closes and lets the click through. Swallowing it made the first
      // click after opening any menu a no-op. A modal dialog still blocks the click.
      if (trap) {
        event.preventDefault();
        event.stopPropagation();
      }
      onClose();
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [anchorRef, onClose, open, trap]);

  if (!open || typeof document === "undefined") return null;
  const resolvedRole = role ?? (pattern === "listbox" ? "listbox" : pattern === "dialog" ? "dialog" : "menu");
  return createPortal(
    <div className="overlay-layer">
      <div
        ref={panelRef}
        className={`overlay-panel is-${pattern}`}
        role={resolvedRole}
        aria-label={label}
        aria-modal={pattern === "dialog" ? true : undefined}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
