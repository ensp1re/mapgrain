import type { EdgeDirection, EdgeType, PortSide } from "@mapgrain/document";

export interface FlowNodeDraft {
  id: string;
  type: "component" | "group";
  position: { x: number; y: number };
  parentId?: string;
  width: number;
  height: number;
  data: {
    kind?: string;
    label: string;
    lines: string[];
    description?: string;
    ports: Array<{ id: string; side: PortSide }>;
  };
}

export interface FlowEdgeDraft {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  points: Array<{ x: number; y: number }>;
  direction: EdgeDirection;
}

export interface ComponentNodeData extends Record<string, unknown> {
  kind: string;
  label: string;
  lines: string[];
  ports: Array<{ id: string; side: PortSide }>;
  editing: boolean;
  onStartEdit: () => void;
  onCommitLabel: (label: string) => void;
  onCancelEdit: () => void;
}

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  editing: boolean;
  onStartEdit: () => void;
  onCommitLabel: (label: string) => void;
  onCancelEdit: () => void;
}

export interface RelationEdgeData extends Record<string, unknown> {
  label?: string;
  type: EdgeType;
  direction: EdgeDirection;
  points: Array<{ x: number; y: number }>;
}
