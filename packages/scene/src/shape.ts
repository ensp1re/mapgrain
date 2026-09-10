import { DOCUMENT_KIND, NODE_KIND, type DocumentKind } from "@mapgrain/document";
import { NODE_SHAPE, type NodeShape } from "./constants/shape.ts";

export function shapeForNode(documentKind: DocumentKind, kind: string): NodeShape | undefined {
  if (documentKind !== DOCUMENT_KIND.DATA_FLOW) return undefined;
  if (kind === NODE_KIND.PROCESS) return NODE_SHAPE.PROCESS;
  if (kind === NODE_KIND.DATASTORE) return NODE_SHAPE.STORE;
  if (kind === NODE_KIND.ENTITY || kind === NODE_KIND.EXTERNAL) return NODE_SHAPE.ENTITY;
  return undefined;
}
