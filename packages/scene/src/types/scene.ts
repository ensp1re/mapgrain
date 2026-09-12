import type {
  DocumentKind,
  EdgeDirection,
  EdgeShape,
  NodeKind,
  NodeMarker,
  PortSide,
  SequenceFragmentKind,
  ValidationIssue,
} from "@mapgrain/document";
import type { NodeShape } from "../constants/shape.ts";
import type { Point, Rect } from "./geometry.ts";

export interface TextLine {
  text: string;
  width: number;
  height: number;
}

export interface MeasuredText {
  lines: TextLine[];
  width: number;
  height: number;
}

export interface ScenePort {
  id: string;
  nodeId: string;
  side: PortSide;
  x: number;
  y: number;
}

export interface ScenePresentation {
  fontFamily: string;
  titleSize: number;
  titleLineHeight: number;
  titleWeight: number;
  kindSize: number;
  kindLineHeight: number;
  kindTrackingEm: number;
  iconSize: number;
  iconGap: number;
  paddingX: number;
  paddingY: number;
  kindTitleGap: number;
  descriptionGap: number;
}

export interface SceneNode {
  id: string;
  kind: NodeKind;
  kindLabel: MeasuredText;
  label: MeasuredText;
  rect: Rect;
  ports: ScenePort[];
  groupId: string | null;
  marker?: NodeMarker;
  role?: string;
  shape?: NodeShape;
  /** Measured second line, present only when the node carries a description. */
  description?: MeasuredText;
  iconSize: number;
}

export interface SceneLifeline {
  nodeId: string;
  x: number;
  y1: number;
  y2: number;
}

export interface SceneEdge {
  id: string;
  source: { nodeId: string; portId: string };
  target: { nodeId: string; portId: string };
  points: Point[];
  /** How the polyline is drawn. The points are the same geometry either way. */
  shape: EdgeShape;
  direction: EdgeDirection;
  caption: string;
  label: MeasuredText;
  labelAnchor: Point;
  labelBox: Rect;
}

export interface SceneGroup {
  id: string;
  label: MeasuredText;
  parentId: string | null;
  rect: Rect;
  role?: string;
}

export interface SceneFragmentOperand {
  label: string;
  y: number;
  height: number;
}

export interface SceneFragment {
  id: string;
  kind: SequenceFragmentKind;
  title: string;
  rect: Rect;
  operands: SceneFragmentOperand[];
}

export interface Scene {
  documentId: string;
  documentKind: DocumentKind;
  revision: number;
  bounds: Rect;
  nodes: SceneNode[];
  edges: SceneEdge[];
  groups: SceneGroup[];
  lifelines: SceneLifeline[];
  fragments: SceneFragment[];
  presentation: ScenePresentation;
}

export type SceneResult =
  | { ok: true; scene: Scene }
  | { ok: false; errors: ValidationIssue[] };
