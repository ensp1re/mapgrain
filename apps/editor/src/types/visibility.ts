export interface VisibilityState {
  /** Components and lanes the reader has hidden. Never part of the document. */
  hiddenNodeIds: readonly string[];
  /** Connections hidden one at a time. */
  hiddenEdgeIds: readonly string[];
  /** Hides every connection at once, so the components can be read on their own. */
  allEdgesHidden: boolean;
}

export interface VisibleSet {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  hiddenNodes: number;
  hiddenEdges: number;
}
