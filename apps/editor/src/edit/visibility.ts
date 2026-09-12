import type { DiagramDocument } from "@mapgrain/document";
import type { VisibilityState, VisibleSet } from "../types/visibility.ts";

export const EMPTY_VISIBILITY: VisibilityState = {
  hiddenNodeIds: [],
  hiddenEdgeIds: [],
  allEdgesHidden: false,
};

function descendantGroups(document: DiagramDocument, groupId: string): Set<string> {
  const found = new Set([groupId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const group of document.groups) {
      if (group.parentId && found.has(group.parentId) && !found.has(group.id)) {
        found.add(group.id);
        grew = true;
      }
    }
  }
  return found;
}

/**
 * What the canvas should draw.
 *
 * Hiding is a reading aid, not an edit: the document is untouched and every hidden item comes
 * back. Hiding a lane hides what it contains, and hiding a component hides the connections
 * that would otherwise dangle.
 */
export function visibleSet(document: DiagramDocument, state: VisibilityState): VisibleSet {
  const hidden = new Set(state.hiddenNodeIds);
  const hiddenGroups = new Set<string>();
  for (const id of state.hiddenNodeIds) {
    if (!document.groups.some((group) => group.id === id)) continue;
    for (const nested of descendantGroups(document, id)) hiddenGroups.add(nested);
  }

  const nodeIds = new Set<string>();
  for (const node of document.nodes) {
    if (hidden.has(node.id)) continue;
    if (node.groupId && hiddenGroups.has(node.groupId)) continue;
    nodeIds.add(node.id);
  }

  const hiddenEdges = new Set(state.hiddenEdgeIds);
  const edgeIds = new Set<string>();
  if (!state.allEdgesHidden) {
    for (const edge of document.edges) {
      if (hiddenEdges.has(edge.id)) continue;
      if (!nodeIds.has(edge.source.nodeId) || !nodeIds.has(edge.target.nodeId)) continue;
      edgeIds.add(edge.id);
    }
  }

  const groupIds = new Set(document.groups.map((group) => group.id));
  for (const id of groupIds) {
    if (!hiddenGroups.has(id)) nodeIds.add(id);
  }

  return {
    nodeIds,
    edgeIds,
    hiddenNodes: document.nodes.length - [...nodeIds].filter((id) => !groupIds.has(id)).length,
    hiddenEdges: document.edges.length - edgeIds.size,
  };
}

export function toggleHidden(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function isHiding(state: VisibilityState): boolean {
  return state.hiddenNodeIds.length > 0 || state.hiddenEdgeIds.length > 0 || state.allEdgesHidden;
}
