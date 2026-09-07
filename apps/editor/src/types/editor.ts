import type { DiagramDocument, EdgeDirection, EdgeType } from "@mapgrain/document";
import type { ALIGN_KIND } from "../constants/align.ts";

export type AlignKind = (typeof ALIGN_KIND)[keyof typeof ALIGN_KIND];

export interface PositionMap {
  [id: string]: { x: number; y: number };
}

export interface EditorSnapshot {
  document: DiagramDocument;
  positions: PositionMap;
}

export interface EditorSelection {
  nodeIds: string[];
  edgeIds: string[];
}

export interface PendingConnection {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export interface ConnectionDraft {
  type: EdgeType;
  direction: EdgeDirection;
  label: string;
}
