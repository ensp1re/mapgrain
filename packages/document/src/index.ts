export {
  DOCUMENT_KIND,
  EDGE_DIRECTION,
  EDGE_TYPE,
  EVIDENCE_STATE,
  EVIDENCE_TARGET_KIND,
  LAYOUT_DIRECTION,
  NODE_KIND,
  PORT_SIDE,
  SCHEMA_VERSION,
  THEME,
  VIEW_KIND,
} from "./constants/document.ts";
export { VALIDATION_ERROR_CODE } from "./constants/errors.ts";
export { DiagramDocumentSchema, documentJsonSchema } from "./schema/document.ts";
export type {
  DiagramDocument,
  DiagramEdge,
  DiagramEvidence,
  DiagramGroup,
  DiagramNode,
  DiagramPort,
  DiagramView,
  DocumentKind,
  EdgeDirection,
  EdgeType,
  EvidenceState,
  LayoutDirection,
  LayoutHints,
  NodeKind,
  PortSide,
  Theme,
} from "./types/document.ts";
export type { ValidationErrorCode, ValidationIssue, ValidationResult } from "./types/validation.ts";
export { validateDocument } from "./validate.ts";
