import type { NodeProps } from "@xyflow/react";

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
}

export function GroupNode({ data, selected }: NodeProps) {
  const group = data as GroupNodeData;
  return (
    <div className={selected ? "group-frame is-selected" : "group-frame"}>
      <div className="group-label">{group.label}</div>
    </div>
  );
}
