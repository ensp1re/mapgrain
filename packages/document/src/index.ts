export { compareDocuments } from "./compare.ts";
export {
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
  THEME,
  VIEW_KIND,
} from "./constants/document.ts";
export { snapshotMatches } from "./evidence.ts";
export { defaultEdgeType, EDGES_FOR_KIND, NODES_FOR_KIND } from "./constants/modes.ts";
export { VALIDATION_ERROR_CODE } from "./constants/errors.ts";
export { OPERATION_KIND } from "./constants/operations.ts";
export { applyPortableLayout, portablePositions } from "./layout/portable.ts";
export { applyOperation, applyOperationAt, nextPrefixedId } from "./operations/apply.ts";
export { DiagramDocumentSchema, documentJsonSchema } from "./schema/document.ts";
export type {
  DiagramDocument,
  DiagramEdge,
  DiagramEvidence,
  DiagramGroup,
  DiagramNode,
  DiagramPort,
  DiagramStory,
  DiagramStoryStep,
  DiagramView,
  DocumentKind,
  EdgeDirection,
  EdgeType,
  EvidenceState,
  LayoutDirection,
  LayoutHints,
  LayoutPoint,
  LayoutSection,
  NodeKind,
  NodeMarker,
  PortSide,
  Preset,
  Theme,
} from "./types/document.ts";

export type { DocumentDelta } from "./compare.ts";
export type { ApplyResult, Operation, OperationKind } from "./types/operation.ts";
export type { ValidationErrorCode, ValidationIssue, ValidationResult } from "./types/validation.ts";
export { validateDocument } from "./validate.ts";
