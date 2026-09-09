import { useViewport } from "@xyflow/react";
import type { SceneLifeline } from "@mapgrain/scene";

interface LifelineLayerProps {
  lifelines: SceneLifeline[];
}

export function LifelineLayer({ lifelines }: LifelineLayerProps) {
  const { x, y, zoom } = useViewport();
  if (lifelines.length === 0) return null;
  return (
    <svg
      className="lifeline-layer"
      aria-hidden="true"
      style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})` }}
    >
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
