import {
  VALIDATION_ERROR_CODE,
  validateDocument,
  type DiagramDocument,
  type ValidationIssue,
} from "@mapgrain/document";
import { buildScene, type Point, type Size } from "@mapgrain/scene";
import { LAYOUT_STATUS } from "../constants/codes.ts";
import { applyPins } from "../pins.ts";
import type { LayoutConflict, WorkerLayoutResponse } from "../types/layout.ts";
import { collectPositions, toElkGraph, type ElkNode } from "./graph.ts";

export interface ElkEngine {
  layout: (graph: ElkNode) => Promise<ElkNode>;
}

export { LAYOUT_STATUS } from "../constants/codes.ts";
export type { LayoutConflict, LayoutResult, WorkerLayoutResponse } from "../types/layout.ts";

function sizesFromDocument(
  document: DiagramDocument,
): Map<string, Size> | { errors: ValidationIssue[] } {
  const scene = buildScene(document);
  if (!scene.ok) return { errors: scene.errors };
  return new Map(
    scene.scene.nodes.map((node) => [
      node.id,
      { width: node.rect.width, height: node.rect.height },
    ]),
  );
}

export async function runLayout(
  id: number,
  threadId: number,
  input: unknown,
  pins: Record<string, Point>,
  elk: ElkEngine,
): Promise<WorkerLayoutResponse> {
  const validated = validateDocument(input);
  if (!validated.ok) {
    return { id, threadId, status: LAYOUT_STATUS.INVALID, errors: validated.errors };
  }
  const sizes = sizesFromDocument(validated.document);
  if (!(sizes instanceof Map)) {
    return { id, threadId, status: LAYOUT_STATUS.INVALID, errors: sizes.errors ?? [] };
  }

  const graph = toElkGraph(validated.document, sizes);
  let laidOut: ElkNode;
  try {
    laidOut = await elk.layout(graph);
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return {
      id,
      threadId,
      status: LAYOUT_STATUS.INVALID,
      errors: [
        {
          code: VALIDATION_ERROR_CODE.INVALID_DOCUMENT,
          message: raw.slice(0, 240) || "ELK layout failed",
          path: "/",
          elementId: null,
        },
      ],
    };
  }
  const leafIds = new Set(validated.document.nodes.map((node) => node.id));
  const elkPositions: Record<string, Point> = {};
  collectPositions(laidOut, 0, 0, leafIds, elkPositions);

  const applied = applyPins(elkPositions, sizes, pins);
  if (applied.conflict) {
    return {
      id,
      threadId,
      status: LAYOUT_STATUS.CONFLICT,
      conflict: applied.conflict satisfies LayoutConflict,
    };
  }
  return {
    id,
    threadId,
    status: LAYOUT_STATUS.LAID_OUT,
    positions: applied.positions,
  };
}
