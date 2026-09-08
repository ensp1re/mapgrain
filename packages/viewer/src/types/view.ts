import type { EDGE_DIRECTION, REACH_MODE } from "../constants/view.ts";

export type EdgeDirection = (typeof EDGE_DIRECTION)[keyof typeof EDGE_DIRECTION];
export type ReachMode = (typeof REACH_MODE)[keyof typeof REACH_MODE];

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  direction: EdgeDirection;
}

export interface GraphIndex {
  down: Map<string, Array<{ nodeId: string; edgeId: string }>>;
  up: Map<string, Array<{ nodeId: string; edgeId: string }>>;
}

export interface ReachResult {
  nodeIds: string[];
  edgeIds: string[];
}

export interface RouteResult {
  nodes: string[];
  edges: string[];
  alternatives: number;
  truncated: boolean;
}

export interface ViewerHashState {
  focus?: string;
  reach?: ReachMode;
  from?: string;
  to?: string;
  view?: string;
  theme?: "dark" | "light";
  story?: string;
  step?: string;
  lens?: string;
  lang?: string;
}

export interface NamedView {
  id: string;
  kind: string;
  name: string;
  nodeIds?: string[];
  edgeIds?: string[];
  path?: { from: string; to: string };
}
