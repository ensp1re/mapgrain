import {
  ICON_SIZE,
  KIND_FONT_SIZE,
  KIND_LETTER_SPACING_EM,
  KIND_LINE_HEIGHT,
} from "./constants/metrics.ts";
import type { FontSpec } from "./types/options.ts";

export function kindDisplayText(kind: string): string {
  return kind.replaceAll("-", " ").toUpperCase();
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
