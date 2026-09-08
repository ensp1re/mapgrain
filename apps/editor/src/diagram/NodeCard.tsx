import type { KeyboardEvent, ReactNode } from "react";

interface NodeCardProps {
  selected?: boolean;
  children: ReactNode;
  onDoubleClick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function NodeCard({ selected, children, onDoubleClick, onKeyDown }: NodeCardProps) {
  return (
    <div
      className={selected ? "node-card is-selected" : "node-card"}
      tabIndex={0}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
