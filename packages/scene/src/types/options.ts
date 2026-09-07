import type { LayoutDirection } from "@mapgrain/document";
import type { Point } from "./geometry.ts";

export interface FontSpec {
  family: string;
  size: number;
  weight: number;
  lineHeight: number;
}

export interface TextMeasurer {
  measure(text: string, font: FontSpec): { width: number; height: number };
}

export interface SceneOptions {
  font: FontSpec;
  measurer: TextMeasurer;
  padding: { x: number; y: number };
  minNodeWidth: number;
  minNodeHeight: number;
  maxLabelWidth: number;
  groupPadding: number;
  groupHeader: number;
  spacing: { x: number; y: number };
  direction: LayoutDirection;
  positions: Record<string, Point>;
}
