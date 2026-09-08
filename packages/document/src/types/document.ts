import type { Static } from "@sinclair/typebox";
import type {
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
  THEME,
  VIEW_KIND,
} from "../constants/document.ts";
import type {
  DiagramDocumentSchema,
  EdgeSchema,
  EvidenceSchema,
  GroupSchema,
  LayoutHintsSchema,
  LayoutPointSchema,
  LayoutSectionSchema,
  NodeSchema,
  PortSchema,
  StorySchema,
  StoryStepSchema,
  ViewSchema,
} from "../schema/document.ts";

export type DocumentKind = (typeof DOCUMENT_KIND)[keyof typeof DOCUMENT_KIND];
export type NodeKind = (typeof NODE_KIND)[keyof typeof NODE_KIND];
export type NodeMarker = (typeof NODE_MARKER)[keyof typeof NODE_MARKER];
export type EdgeType = (typeof EDGE_TYPE)[keyof typeof EDGE_TYPE];
export type EdgeDirection = (typeof EDGE_DIRECTION)[keyof typeof EDGE_DIRECTION];
export type PortSide = (typeof PORT_SIDE)[keyof typeof PORT_SIDE];
export type ViewKind = (typeof VIEW_KIND)[keyof typeof VIEW_KIND];
export type LayoutDirection = (typeof LAYOUT_DIRECTION)[keyof typeof LAYOUT_DIRECTION];
export type Theme = (typeof THEME)[keyof typeof THEME];
export type Preset = (typeof PRESET)[keyof typeof PRESET];
export type EvidenceState = (typeof EVIDENCE_STATE)[keyof typeof EVIDENCE_STATE];
export type EvidenceTargetKind =
  (typeof EVIDENCE_TARGET_KIND)[keyof typeof EVIDENCE_TARGET_KIND];

export type DiagramPort = Static<typeof PortSchema>;
export type DiagramNode = Static<typeof NodeSchema>;
export type DiagramEdge = Static<typeof EdgeSchema>;
export type DiagramGroup = Static<typeof GroupSchema>;
export type DiagramView = Static<typeof ViewSchema>;
export type LayoutHints = Static<typeof LayoutHintsSchema>;
export type LayoutPoint = Static<typeof LayoutPointSchema>;
export type LayoutSection = Static<typeof LayoutSectionSchema>;
export type LayoutSectionVersion = typeof LAYOUT_SECTION_VERSION;
export type DiagramEvidence = Static<typeof EvidenceSchema>;
export type DiagramStory = Static<typeof StorySchema>;
export type DiagramStoryStep = Static<typeof StoryStepSchema>;
export type DiagramDocument = Static<typeof DiagramDocumentSchema>;
