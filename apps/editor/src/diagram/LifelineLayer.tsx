import { useViewport } from "@xyflow/react";
import type { SceneFragment, SceneLifeline } from "@mapgrain/scene";

interface LifelineLayerProps {
  lifelines: SceneLifeline[];
  fragments?: SceneFragment[];
  /** Clicking a lifeline selects its participant, so a sequence reads like any other diagram. */
  onSelectNode?: (nodeId: string) => void;
  selectedId?: string | null;
}

export function LifelineLayer({
  lifelines,
  fragments = [],
  onSelectNode,
  selectedId = null,
}: LifelineLayerProps) {
  const { x, y, zoom } = useViewport();
  if (lifelines.length === 0 && fragments.length === 0) return null;
  return (
    <svg
      className="lifeline-layer"
      aria-hidden="true"
      style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})` }}
    >
      {fragments.map((fragment) => (
        <g key={fragment.id} data-kind="fragment" data-id={fragment.id} data-fragment-kind={fragment.kind}>
          <rect
            className="sequence-fragment"
            x={fragment.rect.x}
            y={fragment.rect.y}
            width={fragment.rect.width}
            height={fragment.rect.height}
            rx="6"
          />
          <text className="sequence-fragment-label" x={fragment.rect.x + 10} y={fragment.rect.y + 14}>
            {fragment.title}
          </text>
          {fragment.operands.slice(1).map((operand) => (
            <line
              key={`${fragment.id}-${operand.label}`}
              className="sequence-fragment-split"
              x1={fragment.rect.x}
              y1={operand.y}
              x2={fragment.rect.x + fragment.rect.width}
              y2={operand.y}
            />
          ))}
        </g>
      ))}
      {lifelines.map((line) => (
        <g key={line.nodeId} data-kind="lifeline" data-id={line.nodeId}>
          <line
            className={selectedId === line.nodeId ? "lifeline is-selected" : "lifeline"}
            x1={line.x}
            y1={line.y1}
            x2={line.x}
            y2={line.y2}
          />
          {onSelectNode ? (
            <line
              className="lifeline-hit"
              x1={line.x}
              y1={line.y1}
              x2={line.x}
              y2={line.y2}
              onClick={() => onSelectNode(line.nodeId)}
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}
