import { Type } from "@sinclair/typebox";
import {
  DOCUMENT_KIND,
  EDGE_DIRECTION,
  EDGE_TYPE,
  EVIDENCE_STATE,
  EVIDENCE_TARGET_KIND,
  LAYOUT_DIRECTION,
  LAYOUT_SECTION_VERSION,
  NODE_KIND,
  NODE_MARKER,
  PORT_SIDE,
  PRESET,
  SCHEMA_VERSION,
  SEQUENCE_FRAGMENT_KIND,
  THEME,
  VIEW_KIND,
  valuesOf,
} from "../constants/document.ts";

function stringUnion<T extends string>(values: readonly T[]) {
  return Type.Union(values.map((value) => Type.Literal(value)));
}

const Id = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z][A-Za-z0-9_-]*$",
});

export const PortSchema = Type.Object(
  {
    id: Id,
    side: stringUnion(valuesOf(PORT_SIDE)),
    label: Type.Optional(Type.String({ maxLength: 80 })),
  },
  { additionalProperties: false },
);

export const NodeSchema = Type.Object(
  {
    id: Id,
    kind: stringUnion(valuesOf(NODE_KIND)),
    label: Type.String({ minLength: 1, maxLength: 500 }),
    description: Type.Optional(Type.String({ maxLength: 4000 })),
    groupId: Type.Union([Id, Type.Null()]),
    ports: Type.Array(PortSchema, { default: [] }),
    marker: Type.Optional(stringUnion(valuesOf(NODE_MARKER))),
    role: Type.Optional(Type.String({ minLength: 1, maxLength: 40 })),
  },
  { additionalProperties: false },
);

export const EdgeEndpointSchema = Type.Object(
  {
    nodeId: Id,
    portId: Type.Optional(Id),
  },
  { additionalProperties: false },
);

export const EdgeSchema = Type.Object(
  {
    id: Id,
    source: EdgeEndpointSchema,
    target: EdgeEndpointSchema,
    type: stringUnion(valuesOf(EDGE_TYPE)),
    direction: stringUnion(valuesOf(EDGE_DIRECTION)),
    label: Type.Optional(Type.String({ maxLength: 200 })),
    evidenceState: Type.Optional(stringUnion(valuesOf(EVIDENCE_STATE))),
    order: Type.Optional(Type.Integer({ minimum: 1 })),
    guard: Type.Optional(Type.String({ maxLength: 200 })),
    outcome: Type.Optional(Type.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

export const GroupSchema = Type.Object(
  {
    id: Id,
    label: Type.String({ minLength: 1, maxLength: 200 }),
    parentId: Type.Union([Id, Type.Null()]),
  },
  { additionalProperties: false },
);

export const ViewPathSchema = Type.Object(
  {
    from: Id,
    to: Id,
  },
  { additionalProperties: false },
);

export const ViewSchema = Type.Object(
  {
    id: Id,
    kind: stringUnion(valuesOf(VIEW_KIND)),
    name: Type.String({ minLength: 1, maxLength: 200 }),
    nodeIds: Type.Optional(Type.Array(Id)),
    edgeIds: Type.Optional(Type.Array(Id)),
    path: Type.Optional(ViewPathSchema),
  },
  { additionalProperties: false },
);

export const LayoutHintsSchema = Type.Object(
  {
    direction: stringUnion(valuesOf(LAYOUT_DIRECTION)),
    pinnedNodeIds: Type.Array(Id),
  },
  { additionalProperties: false },
);

export const LayoutPointSchema = Type.Object(
  {
    x: Type.Number(),
    y: Type.Number(),
  },
  { additionalProperties: false },
);

export const LayoutSectionSchema = Type.Object(
  {
    version: Type.Literal(LAYOUT_SECTION_VERSION),
    revision: Type.Integer({ minimum: 1 }),
    positions: Type.Record(Id, LayoutPointSchema),
  },
  { additionalProperties: false },
);

export const EvidenceSchema = Type.Object(
  {
    id: Id,
    targetKind: stringUnion(valuesOf(EVIDENCE_TARGET_KIND)),
    targetId: Id,
    state: stringUnion(valuesOf(EVIDENCE_STATE)),
    note: Type.Optional(Type.String({ maxLength: 2000 })),
    path: Type.Optional(Type.String({ minLength: 1, maxLength: 400 })),
    revision: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
    location: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
    snapshot: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
  },
  { additionalProperties: false },
);

export const StoryStepSchema = Type.Object(
  {
    id: Id,
    name: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.Optional(Type.String({ maxLength: 2000 })),
    nodeId: Type.Optional(Id),
    viewId: Type.Optional(Id),
  },
  { additionalProperties: false },
);

export const StorySchema = Type.Object(
  {
    id: Id,
    name: Type.String({ minLength: 1, maxLength: 200 }),
    steps: Type.Array(StoryStepSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);

export const SequenceFragmentOperandSchema = Type.Object(
  {
    label: Type.String({ minLength: 1, maxLength: 200 }),
    startOrder: Type.Integer({ minimum: 1 }),
    endOrder: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const SequenceFragmentSchema = Type.Object(
  {
    id: Id,
    kind: stringUnion(valuesOf(SEQUENCE_FRAGMENT_KIND)),
    operands: Type.Array(SequenceFragmentOperandSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);

export const DiagramDocumentSchema = Type.Object(
  {
    schemaVersion: Type.Literal(SCHEMA_VERSION),
    id: Id,
    revision: Type.Integer({ minimum: 1 }),
    kind: stringUnion(valuesOf(DOCUMENT_KIND)),
    title: Type.String({ minLength: 1, maxLength: 200 }),
    nodes: Type.Array(NodeSchema),
    edges: Type.Array(EdgeSchema),
    groups: Type.Array(GroupSchema),
    views: Type.Array(ViewSchema),
    layoutHints: LayoutHintsSchema,
    layout: Type.Optional(LayoutSectionSchema),
    theme: stringUnion(valuesOf(THEME)),
    preset: Type.Optional(stringUnion(valuesOf(PRESET))),
    evidence: Type.Optional(Type.Array(EvidenceSchema)),
    stories: Type.Optional(Type.Array(StorySchema)),
    fragments: Type.Optional(Type.Array(SequenceFragmentSchema)),
  },
  {
    additionalProperties: false,
    $id: "urn:mapgrain:schema:document:v1",
    title: "DiagramDocument",
  },
);

export function documentJsonSchema(): unknown {
  return JSON.parse(JSON.stringify(DiagramDocumentSchema)) as unknown;
}
