import type { DocumentKind, DiagramDocument, EdgeType, NodeKind } from "./document.ts";

export type ConversionAction = "keep" | "remap" | "drop";

export interface ConversionChange {
  id: string;
  label: string;
  action: ConversionAction;
  from: NodeKind | EdgeType;
  to: NodeKind | EdgeType | null;
}

export interface ConversionPreview {
  from: DocumentKind;
  to: DocumentKind;
  nodes: ConversionChange[];
  edges: ConversionChange[];
  fragmentsDropped: number;
  document: DiagramDocument;
}
