import {
  EDGE_DIRECTION,
  LAYOUT_DIRECTION,
  PORT_SIDE,
  SCHEMA_VERSION,
  THEME,
  VIEW_KIND,
  defaultEdgeType,
  type DiagramDocument,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramNode,
  type DocumentKind,
  type EdgeType,
  type NodeKind,
  type NodeMarker,
} from "@mapgrain/document";
import { TEMPLATE_COLUMN, TEMPLATE_ROW } from "../constants/templates.ts";

interface NodeSpec {
  id: string;
  kind: NodeKind;
  label: string;
  /** Column and row on the template grid. Omitted where the layout engine owns placement. */
  at?: [column: number, row: number];
  group?: string;
  marker?: NodeMarker;
  description?: string;
}

interface EdgeSpec {
  from: string;
  to: string;
  label?: string;
  type?: EdgeType;
  order?: number;
  guard?: string;
  outcome?: string;
  direction?: DiagramEdge["direction"];
}

export interface TemplateInput {
  id: string;
  title: string;
  kind: DocumentKind;
  viewName?: string;
  groups?: Array<{ id: string; label: string; parent?: string }>;
  nodes: NodeSpec[];
  edges: EdgeSpec[];
}

function toNode(spec: NodeSpec): DiagramNode {
  return {
    id: spec.id,
    kind: spec.kind,
    label: spec.label,
    groupId: spec.group ?? null,
    ports: [
      { id: "in", side: PORT_SIDE.WEST },
      { id: "out", side: PORT_SIDE.EAST },
    ],
    ...(spec.marker ? { marker: spec.marker } : {}),
    ...(spec.description ? { description: spec.description } : {}),
  };
}

function toEdge(spec: EdgeSpec, kind: DocumentKind, index: number): DiagramEdge {
  return {
    id: `e${index + 1}`,
    source: { nodeId: spec.from, portId: "out" },
    target: { nodeId: spec.to, portId: "in" },
    type: spec.type ?? defaultEdgeType(kind),
    direction: spec.direction ?? EDGE_DIRECTION.FORWARD,
    ...(spec.label ? { label: spec.label } : {}),
    ...(spec.order === undefined ? {} : { order: spec.order }),
    ...(spec.guard ? { guard: spec.guard } : {}),
    ...(spec.outcome ? { outcome: spec.outcome } : {}),
  };
}

function toGroup(spec: { id: string; label: string; parent?: string }): DiagramGroup {
  return { id: spec.id, label: spec.label, parentId: spec.parent ?? null };
}

/**
 * Builds a template document from a compact description. Authored grid positions beat a
 * generic layout pass for a showcase diagram, so anything with `at` is pinned into the
 * portable layout; sequence and lane documents leave placement to their own engines.
 */
export function template(input: TemplateInput): DiagramDocument {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of input.nodes) {
    if (!node.at) continue;
    positions[node.id] = { x: node.at[0] * TEMPLATE_COLUMN, y: node.at[1] * TEMPLATE_ROW };
  }
  const placed = Object.keys(positions).length > 0;
  return {
    schemaVersion: SCHEMA_VERSION,
    id: input.id,
    revision: 1,
    kind: input.kind,
    title: input.title,
    theme: THEME.DARK,
    layoutHints: { direction: LAYOUT_DIRECTION.RIGHT, pinnedNodeIds: [] },
    groups: (input.groups ?? []).map(toGroup),
    nodes: input.nodes.map(toNode),
    edges: input.edges.map((edge, index) => toEdge(edge, input.kind, index)),
    views: [{ id: "overview", kind: VIEW_KIND.OVERVIEW, name: input.viewName ?? "All" }],
    ...(placed ? { layout: { version: 1, revision: 1, positions } } : {}),
  };
}
