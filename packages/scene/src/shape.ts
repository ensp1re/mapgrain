import { DOCUMENT_KIND, NODE_KIND, NODE_MARKER, type DocumentKind, type NodeMarker } from "@mapgrain/document";
import { NODE_SHAPE, type NodeShape } from "./constants/shape.ts";

/**
 * The outline a node is drawn with.
 *
 * Every kind used to be the same rounded rectangle, so a branch looked exactly like a step.
 * A decision is a diamond and a start or end state is a pill, which is the convention readers
 * already know from flowcharts and state charts.
 */
export function shapeForNode(
  documentKind: DocumentKind,
  kind: string,
  marker?: NodeMarker,
): NodeShape | undefined {
  if (kind === NODE_KIND.DECISION) return NODE_SHAPE.DECISION;
  if (kind === NODE_KIND.STATE && marker) return NODE_SHAPE.TERMINAL;
  if (documentKind !== DOCUMENT_KIND.DATA_FLOW) return undefined;
  if (kind === NODE_KIND.PROCESS) return NODE_SHAPE.PROCESS;
  if (kind === NODE_KIND.DATASTORE) return NODE_SHAPE.STORE;
  if (kind === NODE_KIND.ENTITY || kind === NODE_KIND.EXTERNAL) return NODE_SHAPE.ENTITY;
  return undefined;
}

export function isTerminalMarker(marker: NodeMarker | undefined): boolean {
  return marker === NODE_MARKER.INITIAL || marker === NODE_MARKER.FINAL;
}
