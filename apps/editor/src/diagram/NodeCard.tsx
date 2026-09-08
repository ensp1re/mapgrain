import type { ReactNode } from "react";

interface NodeCardProps {
  selected?: boolean;
  children: ReactNode;
  onDoubleClick?: () => void;
}

export function NodeCard({ selected, children, onDoubleClick }: NodeCardProps) {
  return (
    <div className={selected ? "node-card is-selected" : "node-card"} onDoubleClick={onDoubleClick}>
      {children}
    </div>
  );
}
