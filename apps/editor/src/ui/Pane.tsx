import type { ReactNode } from "react";

interface PaneProps {
  as?: "aside" | "nav" | "div";
  title: string;
  ariaLabel?: string;
  className: string;
  role?: string;
  children: ReactNode;
}

export function Pane({
  as: Tag = "aside",
  title,
  ariaLabel,
  className,
  role,
  children,
}: PaneProps) {
  return (
    <Tag className={className} aria-label={ariaLabel ?? title} role={role}>
      <div className="pane-label">{title}</div>
      {children}
    </Tag>
  );
}
