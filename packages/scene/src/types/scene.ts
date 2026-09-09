import type { EdgeDirection, NodeKind, NodeMarker, PortSide, ValidationIssue } from "@mapgrain/document";
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
}

export interface Scene {
  documentId: string;
  revision: number;
  bounds: Rect;
  nodes: SceneNode[];
  edges: SceneEdge[];
  groups: SceneGroup[];
  lifelines: SceneLifeline[];
  presentation: ScenePresentation;
}

export type SceneResult =
  | { ok: true; scene: Scene }
  | { ok: false; errors: ValidationIssue[] };
