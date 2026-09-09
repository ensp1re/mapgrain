import { useViewport } from "@xyflow/react";
import type { SceneFragment, SceneLifeline } from "@mapgrain/scene";

interface LifelineLayerProps {
  lifelines: SceneLifeline[];
  fragments?: SceneFragment[];
}

export function LifelineLayer({ lifelines, fragments = [] }: LifelineLayerProps) {
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
        <line
          key={line.nodeId}
          data-kind="lifeline"
          data-id={line.nodeId}
          x1={line.x}
          y1={line.y1}
          x2={line.x}
          y2={line.y2}
        />
      ))}
    </svg>
  );
}
