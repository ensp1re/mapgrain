import type { OPERATION_KIND } from "../constants/operations.ts";
import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  EdgeDirection,
  EdgeType,
  LayoutPoint,
  Theme,
} from "./document.ts";
import type { ValidationIssue } from "./validation.ts";

export type OperationKind = (typeof OPERATION_KIND)[keyof typeof OPERATION_KIND];

export type Operation =
  | { kind: typeof OPERATION_KIND.SET_TITLE; title: string }
  | { kind: typeof OPERATION_KIND.SET_NODE_LABEL; nodeId: string; label: string }
  | { kind: typeof OPERATION_KIND.SET_GROUP_LABEL; groupId: string; label: string }
  | { kind: typeof OPERATION_KIND.SET_EDGE_LABEL; edgeId: string; label: string }
  | { kind: typeof OPERATION_KIND.SET_EDGE_TYPE; edgeId: string; type: EdgeType }
  | { kind: typeof OPERATION_KIND.SET_EDGE_DIRECTION; edgeId: string; direction: EdgeDirection }
  | {
      kind: typeof OPERATION_KIND.ADD_NODE;
      node: DiagramNode;
      edges?: DiagramEdge[];
      pinned?: boolean;
      views?: DiagramDocument["views"];
    }
  | {
      kind: typeof OPERATION_KIND.ADD_EDGE;
      id: string;
      source: { nodeId: string; portId?: string };
      target: { nodeId: string; portId?: string };
      type: EdgeType;
      direction: EdgeDirection;
      label?: string;
      order?: number;
      guard?: string;
      outcome?: string;
    }
  | { kind: typeof OPERATION_KIND.DELETE_NODE; nodeId: string }
  | { kind: typeof OPERATION_KIND.DELETE_EDGE; edgeId: string }
  | { kind: typeof OPERATION_KIND.DUPLICATE_NODE; nodeId: string; newId: string }
  | { kind: typeof OPERATION_KIND.SET_NODE_GROUP; nodeId: string; groupId: string | null }
  | { kind: typeof OPERATION_KIND.SET_NODE_PINNED; nodeId: string; pinned: boolean }
  | { kind: typeof OPERATION_KIND.SET_LAYOUT; positions: Record<string, LayoutPoint> }
  | { kind: typeof OPERATION_KIND.SET_THEME; theme: Theme }
  | { kind: typeof OPERATION_KIND.ADD_GROUP; id: string; label: string; parentId?: string | null }
  | { kind: typeof OPERATION_KIND.DELETE_GROUP; groupId: string };

export type ApplyResult =
  | { ok: true; document: DiagramDocument; inverse: Operation }
  | { ok: false; document: DiagramDocument; errors: ValidationIssue[] };
