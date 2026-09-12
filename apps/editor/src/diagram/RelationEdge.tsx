import { BaseEdge, EdgeLabelRenderer, useNodes, type EdgeProps } from "@xyflow/react";
import { edgeCaption, mapScenePolyline, placeEdgeLabel, roundedPolylinePath } from "@mapgrain/scene";
import type { RelationEdgeData } from "../types/flow.ts";
import { captionLabelSize, flowComponentObstacles } from "./edgeObstacles.ts";


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
  const nodes = useNodes();
  const mapped = edge?.preserveGeometry
    ? (edge.points ?? [])
    : mapScenePolyline(edge?.points ?? [], sourceX, sourceY, targetX, targetY);
  const path = roundedPolylinePath(mapped.length >= 2 ? mapped : [
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
  ]);
  const caption = edge?.caption || edgeCaption(edge?.type ?? "", edge?.label);
  // The scene places every caption in one pass, treating the captions it has already placed
  // as obstacles. Recomputing per edge here loses that, and congested diagrams stacked
  // several captions on the same point. Keep the scene's anchor unless a drag has actually
  // moved this edge, and only then fall back to a live placement against the node rects.
  const anchored = edge?.labelAnchor !== undefined && !edge.dragging;
  const placed = anchored
    ? null
    : placeEdgeLabel(mapped, captionLabelSize(caption, edge?.labelSize), flowComponentObstacles(nodes));
  const labelX = placed ? placed.anchor.x : (edge?.labelAnchor?.x ?? 0);
  const labelY = placed ? placed.anchor.y : (edge?.labelAnchor?.y ?? 0);
  return (
    <>
      <path d={path} className="edge-hit" fill="none" />
      <BaseEdge id={id} path={path} markerEnd={markerEnd} markerStart={markerStart} />
      {caption ? (
        <EdgeLabelRenderer>
          <div
            className={`edge-caption${edge?.walkStep ? " is-walk-step" : ""}`}
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
