import type { ReactNode } from "react";

interface PaneProps {
  as?: "aside" | "nav" | "div";
  title: string;
  meta?: ReactNode;
  ariaLabel?: string;
  className: string;
  role?: string;
  onClose?: () => void;
  children: ReactNode;
}

export function Pane({
  as: Tag = "aside",
  title,
  meta,
  ariaLabel,
  className,
  role,
  onClose,
  children,
}: PaneProps) {
  return (
    <Tag className={className} aria-label={ariaLabel ?? title} role={role}>
      <div className="pane-head">
        <div className="pane-label">
          {title}
          {meta != null ? <span className="pane-meta">{meta}</span> : null}
        </div>
        {onClose ? (
          <button type="button" className="text-btn ghost pane-close" onClick={onClose} aria-label={`Close ${title}`}>
            ×
          </button>
        ) : null}
      </div>
      {children}
    </Tag>
  );
}
