import {
  DOCUMENT_KIND,
  LAYOUT_DIRECTION,
  SCHEMA_VERSION,
  THEME,
  VIEW_KIND,
  type DiagramDocument,
  type DocumentKind,
} from "@mapgrain/document";

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
    nodes: [],
    edges: [],
    views: [{ id: "overview", kind: VIEW_KIND.OVERVIEW, name: "All" }],
  };
}
