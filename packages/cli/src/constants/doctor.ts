import {
  DOCUMENT_KIND,
  EDGE_DIRECTION,
  EDGE_TYPE,
  LAYOUT_DIRECTION,
  NODE_KIND,
  PORT_SIDE,
  SCHEMA_VERSION,
  THEME,
  VIEW_KIND,
} from "@mapgrain/document";

export const DOCTOR_DOCUMENT = {
  schemaVersion: SCHEMA_VERSION,
  id: "doc-doctor",
  revision: 1,
  kind: DOCUMENT_KIND.ARCHITECTURE,
  title: "Doctor",
  theme: THEME.DARK,
  layoutHints: { direction: LAYOUT_DIRECTION.RIGHT, pinnedNodeIds: [] },
  groups: [],
  nodes: [
    {
      id: "n1",
      kind: NODE_KIND.SERVICE,
      label: "A",
      groupId: null,
      ports: [{ id: "out", side: PORT_SIDE.EAST }],
    },
    {
      id: "n2",
      kind: NODE_KIND.DATASTORE,
      label: "B",
      groupId: null,
      ports: [{ id: "in", side: PORT_SIDE.WEST }],
    },
  ],
  edges: [
    {
      id: "e1",
      source: { nodeId: "n1", portId: "out" },
      target: { nodeId: "n2", portId: "in" },
      type: EDGE_TYPE.WRITES,
      direction: EDGE_DIRECTION.FORWARD,
    },
  ],
  views: [{ id: "overview", kind: VIEW_KIND.OVERVIEW, name: "All" }],
};
