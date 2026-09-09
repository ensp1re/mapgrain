import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_KIND, NODE_MARKER, PORT_SIDE } from "@mapgrain/document";
import { useEffect, useState } from "react";
import type { ComponentNodeData } from "../types/flow.ts";
import { KindLabel } from "./KindLabel.tsx";
import { NodeCard } from "./NodeCard.tsx";
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
    <NodeCard
      selected={selected}
      className={[
        node.kind === NODE_KIND.STATE ? "is-state" : "",
        node.marker === NODE_MARKER.INITIAL ? "is-initial" : "",
        node.marker === NODE_MARKER.FINAL ? "is-final" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      dataMarker={node.marker}
      dataStateTone={node.stateTone}
      onDoubleClick={() => {
        if (!node.editing) node.onStartEdit();
      }}
      onKeyDown={(event) => {
        if (node.editing) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          node.onStartEdit();
        }
      }}
    >
      {node.ports.flatMap((port) => {
        const position = POSITION[handlePosition(port.side)];
        const unused = !port.asSource && !port.asTarget;
        const asSource =
          port.asSource ||
          (unused && port.side !== PORT_SIDE.WEST && port.side !== PORT_SIDE.NORTH);
        const asTarget =
          port.asTarget || (unused && (port.side === PORT_SIDE.WEST || port.side === PORT_SIDE.NORTH));
        const handles = [];
        if (asSource) {
          handles.push(
            <Handle key={`${port.id}-source`} id={port.id} type="source" position={position} />,
          );
        }
        if (asTarget) {
          handles.push(
            <Handle key={`${port.id}-target`} id={port.id} type="target" position={position} />,
          );
        }
        return handles;
      })}
      {node.marker === NODE_MARKER.INITIAL ? (
        <span className="state-initial" aria-hidden="true" />
      ) : null}
      <div className="node-card-body">
      {node.kind === NODE_KIND.STATE ? null : (
        <KindLabel kind={node.kind} label={node.kindLabel} />
      )}
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
    </NodeCard>
  );
}
