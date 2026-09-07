import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { mapScenePolyline, polylinePath } from "@mapgrain/scene";
import type { RelationEdgeData } from "../types/flow.ts";

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  markerStart,
  data,
}: EdgeProps) {
  const edge = data as RelationEdgeData | undefined;
  const mapped = mapScenePolyline(edge?.points ?? [], sourceX, sourceY, targetX, targetY);
  const path = polylinePath(mapped);
  const mid = mapped[Math.floor(mapped.length / 2)] ?? { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
  const labelX = mid.x;
  const labelY = mid.y;
  const caption = [edge?.type, edge?.label].filter(Boolean).join(" · ");
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} markerStart={markerStart} />
      {caption ? (
        <EdgeLabelRenderer>
          <div
            className="edge-caption"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {caption}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
