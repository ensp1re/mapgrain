import type { EdgeDirection, EdgeType, NodeMarker, PortSide } from "@mapgrain/document";
import type { StateTone } from "@mapgrain/scene";

export interface FlowNodeDraft {
  id: string;
  type: "component" | "group";
  position: { x: number; y: number };
  parentId?: string;
  width: number;
  height: number;
  data: {
    kind?: string;
    kindLabel?: string;
    label: string;
    lines: string[];
    description?: string;
    ports: Array<{ id: string; side: PortSide; asSource: boolean; asTarget: boolean }>;
    marker?: NodeMarker;
    stateTone?: StateTone;
    kindFill?: string;
    lane?: boolean;
    shape?: string;
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
  caption: string;
  labelAnchor: { x: number; y: number };
  labelSize: { width: number; height: number };
  preserveGeometry: boolean;
}

export interface ComponentNodeData extends Record<string, unknown> {
  kind: string;
  kindLabel: string;
  label: string;
  lines: string[];
  ports: Array<{ id: string; side: PortSide; asSource: boolean; asTarget: boolean }>;
  marker?: NodeMarker;
  stateTone?: StateTone;
  kindFill?: string;
  shape?: string;
  editing: boolean;
  onStartEdit: () => void;
  onCommitLabel: (label: string) => void;
  onCancelEdit: () => void;
}

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  lane?: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCommitLabel: (label: string) => void;
  onCancelEdit: () => void;
}

export interface RelationEdgeData extends Record<string, unknown> {
  label?: string;
  /** True while this edge is the step a walkthrough is on. */
  walkStep?: boolean;
  /** True while a node is being dragged, when the scene anchor is stale. */
  dragging?: boolean;
  type: EdgeType;
  direction: EdgeDirection;
  points: Array<{ x: number; y: number }>;
  caption: string;
  labelAnchor: { x: number; y: number };
  labelSize: { width: number; height: number };
  preserveGeometry: boolean;
}
