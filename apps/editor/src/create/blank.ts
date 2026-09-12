import {
  DOCUMENT_KIND,
  LAYOUT_DIRECTION,
  NODE_KIND,
  NODE_MARKER,
  SCHEMA_VERSION,
  THEME,
  VIEW_KIND,
  type DiagramDocument,
  type DiagramNode,
  type DocumentKind,
} from "@mapgrain/document";
import { makeNode } from "./nodes.ts";

// A lifecycle document without an initial state fails validation, so a blank one is never
// empty. Every other kind starts with no nodes.
function seedNodes(kind: DocumentKind): DiagramNode[] {
  if (kind !== DOCUMENT_KIND.LIFECYCLE) return [];
  return [{ ...makeNode("s1", NODE_KIND.STATE, "Start"), marker: NODE_MARKER.INITIAL }];
}

export function blankDocument(
  kind: DocumentKind = DOCUMENT_KIND.ARCHITECTURE,
  title = "Untitled diagram",
): DiagramDocument {
  const id = `doc${Date.now()}`;
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    revision: 1,
    kind,
    title,
    theme: THEME.DARK,
    layoutHints: { direction: LAYOUT_DIRECTION.RIGHT, pinnedNodeIds: [] },
    groups: [],
    nodes: seedNodes(kind),
    edges: [],
    views: [{ id: "overview", kind: VIEW_KIND.OVERVIEW, name: "All" }],
  };
}
