import type { KeyboardEvent, ReactNode } from "react";

interface NodeCardProps {
  selected?: boolean;
  className?: string;
  dataMarker?: string;
  dataStateTone?: string;
  dataKindFill?: string;
  children: ReactNode;
  onDoubleClick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function NodeCard({
  selected,
  className,
  dataMarker,
  dataStateTone,
  dataKindFill,
  children,
  onDoubleClick,
  onKeyDown,
}: NodeCardProps) {
  return (
    <div
      className={["node-card", selected ? "is-selected" : "", className]
        .filter(Boolean)
        .join(" ")}
      data-marker={dataMarker}
      data-state-tone={dataStateTone}
      data-kind-fill={dataKindFill}
      tabIndex={0}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
