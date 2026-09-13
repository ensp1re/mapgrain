import { BaseEdge, EdgeLabelRenderer, useNodes, type EdgeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import { edgeCaption, edgePath, mapScenePolyline, placeEdgeLabel } from "@mapgrain/scene";
import type { RelationEdgeData } from "../types/flow.ts";
import { captionLabelSize, flowComponentObstacles } from "./edgeObstacles.ts";

/** Where an empty caption opens for typing: halfway along the line the reader clicked. */
function midpoint(points: Array<{ x: number; y: number }>): { x: number; y: number } | null {
  if (points.length < 2) return null;
  const index = Math.floor((points.length - 1) / 2);
  const from = points[index];
  const to = points[index + 1];
  if (!from || !to) return null;
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}


export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  markerStart,
  selected,
  data,
}: EdgeProps) {
  const edge = data as RelationEdgeData | undefined;
  const nodes = useNodes();
  const [draft, setDraft] = useState(edge?.label ?? "");
  const editing = Boolean(edge?.editing);

  useEffect(() => {
    if (edge?.editing) setDraft(edge.label ?? "");
  }, [edge?.editing, edge?.label]);
  const mapped = edge?.preserveGeometry
    ? (edge.points ?? [])
    : mapScenePolyline(edge?.points ?? [], sourceX, sourceY, targetX, targetY);
  const path = edgePath(
    mapped.length >= 2 ? mapped : [
      { x: sourceX, y: sourceY },
      { x: targetX, y: targetY },
    ],
    edge?.shape,
  );
  const caption = edge?.caption || edgeCaption(edge?.type ?? "", edge?.label);
  // The scene places every caption in one pass, treating the captions it has already placed
  // as obstacles. Recomputing per edge here loses that, and congested diagrams stacked
  // several captions on the same point. Keep the scene's anchor unless a drag has actually
  // moved this edge, and only then fall back to a live placement against the node rects.
  const anchored = edge?.labelAnchor !== undefined && !edge.dragging;
  const placed = anchored
    ? null
    : placeEdgeLabel(mapped, captionLabelSize(caption, edge?.labelSize), flowComponentObstacles(nodes));
  const blank = editing && !caption ? midpoint(mapped) : null;
  const labelX = blank ? blank.x : placed ? placed.anchor.x : (edge?.labelAnchor?.x ?? 0);
  const labelY = blank ? blank.y : placed ? placed.anchor.y : (edge?.labelAnchor?.y ?? 0);
  return (
    <>
      <path d={path} className="edge-hit" fill="none" />
      {/* .edge-hit is this edge's hit area. React Flow's own 20px interaction path would sit
          above the caption and swallow the double-click that opens it for typing. */}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={0}
      />
      {caption || editing ? (
        <EdgeLabelRenderer>
          <div
            className={[
              "edge-caption",
              edge?.walkStep ? "is-walk-step" : "",
              selected ? "is-selected" : "",
              editing ? "is-editing" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onDoubleClick={(event) => {
              if (editing || !edge?.onStartEdit) return;
              event.stopPropagation();
              edge.onStartEdit();
            }}
          >
            {editing ? (
              <input
                className="caption-input"
                aria-label="Connection label"
                value={draft}
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onBlur={() => edge?.onCommitLabel?.(draft)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") edge?.onCommitLabel?.(draft);
                  if (event.key === "Escape") edge?.onCancelEdit?.();
                }}
              />
            ) : (
              caption
            )}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
