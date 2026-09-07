import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} />;
}
