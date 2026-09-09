import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { edgeCaption, mapScenePolyline, placeEdgeLabel, roundedPolylinePath } from "@mapgrain/scene";
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
  const mapped = edge?.preserveGeometry
    ? (edge.points ?? [])
    : mapScenePolyline(edge?.points ?? [], sourceX, sourceY, targetX, targetY);
  const path = roundedPolylinePath(mapped.length >= 2 ? mapped : [
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
  ]);
  const caption = edge?.caption || edgeCaption(edge?.type ?? "", edge?.label);
  const placed = placeEdgeLabel(mapped, { width: 0, height: 14 });
  const labelX = edge?.preserveGeometry && edge.labelAnchor ? edge.labelAnchor.x : placed.anchor.x;
  const labelY = edge?.preserveGeometry && edge.labelAnchor ? edge.labelAnchor.y : placed.anchor.y;
  return (
    <>
      <path d={path} className="edge-hit" fill="none" />
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
