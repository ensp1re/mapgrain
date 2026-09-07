import { Handle, Position, type NodeProps } from "@xyflow/react";
import { PORT_SIDE, type PortSide } from "@mapgrain/document";
import { handlePosition } from "./sceneToFlow.ts";

export interface ComponentNodeData extends Record<string, unknown> {
  kind: string;
  label: string;
  lines: string[];
  ports: Array<{ id: string; side: PortSide }>;
}

const POSITION: Record<"top" | "bottom" | "left" | "right", Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

export function ComponentNode({ data, selected }: NodeProps) {
  const node = data as ComponentNodeData;
  return (
    <div className={selected ? "node-card is-selected" : "node-card"}>
      {node.ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={port.side === PORT_SIDE.WEST || port.side === PORT_SIDE.NORTH ? "target" : "source"}
          position={POSITION[handlePosition(port.side)]}
        />
      ))}
      <div className="node-kind">{node.kind}</div>
      <div className="node-title">
        {node.lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
