import { NODE_KIND, type NodeKind } from "@mapgrain/document";
import {
  ICON_SIZE,
  KIND_FONT_SIZE,
  KIND_LETTER_SPACING_EM,
  KIND_LINE_HEIGHT,
} from "./constants/metrics.ts";
import type { FontSpec } from "./types/options.ts";

export const KIND_ORDER: readonly NodeKind[] = [
  NODE_KIND.ACTOR,
  NODE_KIND.SYSTEM,
  NODE_KIND.GATEWAY,
  NODE_KIND.SERVICE,
  NODE_KIND.JOB,
  NODE_KIND.DATASTORE,
  NODE_KIND.QUEUE,
  NODE_KIND.EXTERNAL,
  NODE_KIND.DECISION,
  NODE_KIND.PROCESS,
  NODE_KIND.ENTITY,
  NODE_KIND.PARTICIPANT,
  NODE_KIND.STATE,
];

export function kindDisplayText(kind: string): string {
  return kind.replaceAll("-", " ").toUpperCase();
}

export function kindLegendLabel(kind: string): string {
  return kind
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function presentKinds(kinds: readonly string[]): NodeKind[] {
  const seen = new Set(kinds);
  return KIND_ORDER.filter((kind) => seen.has(kind));
}

export function kindFontFor(font: FontSpec): FontSpec {
  const size = font.size <= 12 ? 10 : font.size >= 16 ? 12 : KIND_FONT_SIZE;
  const lineHeight = font.size <= 12 ? 12 : font.size >= 16 ? 16 : KIND_LINE_HEIGHT;
  return {
    family: font.family,
    weight: font.weight,
    size,
    lineHeight,
    letterSpacingEm: KIND_LETTER_SPACING_EM,
  };
}

export function iconSizeFor(font: FontSpec): number {
  if (font.size <= 12) return 14;
  if (font.size >= 16) return 18;
  return ICON_SIZE;
}
