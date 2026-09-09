import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../chrome/focusTrap.ts";

interface OverlayProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  align?: "start" | "end";
  role?: string;
  label?: string;
}

export function Overlay({
  open,
  anchorRef,
  onClose,
  children,
  align = "end",
  role = "menu",
  label,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const place = () => {
      const a = anchor.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      let top = a.bottom + 4;
      let left = align === "end" ? a.right - p.width : a.left;
      if (top + p.height > window.innerHeight - 8) top = Math.max(8, a.top - p.height - 4);
      if (left + p.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - p.width - 8);
      if (left < 8) left = 8;
      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [align, anchorRef, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [anchorRef, onClose, open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="overlay-layer">
      <div ref={panelRef} className="overlay-panel" role={role} aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
