import { Handle, Position, type NodeProps } from "@xyflow/react";
import { PORT_SIDE } from "@mapgrain/document";
import { useEffect, useState } from "react";
import type { ComponentNodeData } from "../types/flow.ts";
import { handlePosition } from "./sceneToFlow.ts";

const POSITION: Record<"top" | "bottom" | "left" | "right", Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

export function ComponentNode({ data, selected }: NodeProps) {
  const node = data as ComponentNodeData;
  const [draft, setDraft] = useState(node.label);

  useEffect(() => {
    if (node.editing) setDraft(node.label);
  }, [node.editing, node.label]);

  return (
    <div
      className={selected ? "node-card is-selected" : "node-card"}
      onDoubleClick={() => {
        if (!node.editing) node.onStartEdit();
      }}
    >
      {node.ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={port.side === PORT_SIDE.WEST || port.side === PORT_SIDE.NORTH ? "target" : "source"}
          position={POSITION[handlePosition(port.side)]}
        />
      ))}
      <div className="node-kind">{node.kind}</div>
      {node.editing ? (
        <input
          className="label-input"
          aria-label="Node label"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onBlur={() => node.onCommitLabel(draft)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") node.onCommitLabel(draft);
            if (event.key === "Escape") node.onCancelEdit();
          }}
        />
      ) : (
        <div className="node-title">
          {node.lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
