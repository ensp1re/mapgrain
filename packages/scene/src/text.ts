import {
  BROAD_WIDTH,
  CYRILLIC_WIDTH,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_LINE_HEIGHT,
  LATIN_WIDTH,
  NARROW_WIDTH,
  SPACE_WIDTH,
  WIDE_WIDTH,
} from "./constants/metrics.ts";
import type { FontSpec, TextMeasurer } from "./types/options.ts";
import type { MeasuredText, TextLine } from "./types/scene.ts";

function unitWidth(code: number): number {
  if (code <= 32) return SPACE_WIDTH;
  if (code === 105 || code === 108 || code === 116 || code === 102 || code === 106 || code === 73 || code === 49) {
    return NARROW_WIDTH;
  }
  if (code === 109 || code === 119 || code === 77 || code === 87) return BROAD_WIDTH;
  if (code < 127) return LATIN_WIDTH;
  if (code >= 0x400 && code <= 0x4ff) return CYRILLIC_WIDTH;
  if (
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff)
  ) {
    return WIDE_WIDTH;
  }
  return LATIN_WIDTH;
}

export function trackedWidth(text: string, font: FontSpec, baseWidth: number): number {
  const extra = Math.max(0, text.length - 1) * font.size * (font.letterSpacingEm ?? 0);
  return baseWidth + extra;
}

export const fontTextMeasurer: TextMeasurer = {
  measure(text, font) {
    let width = 0;
    for (const char of text) {
      width += font.size * unitWidth(char.codePointAt(0) ?? 0);
    }
    return { width: trackedWidth(text, font, width), height: font.lineHeight };
  },
};

export function cachedTextMeasurer(inner: TextMeasurer): TextMeasurer {
  const cache = new Map<string, { width: number; height: number }>();
  return {
    measure(text, font) {
      const key = `${font.family}\0${font.size}\0${font.weight}\0${font.letterSpacingEm ?? 0}\0${text}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const value = inner.measure(text, font);
      cache.set(key, value);
      return value;
    },
  };
}

export const approximateTextMeasurer: TextMeasurer = cachedTextMeasurer(fontTextMeasurer);

export const defaultFont = {
  family: DEFAULT_FONT_FAMILY,
  size: DEFAULT_FONT_SIZE,
  weight: DEFAULT_FONT_WEIGHT,
  lineHeight: DEFAULT_LINE_HEIGHT,
} satisfies FontSpec;

function wrapLine(
  line: string,
  maxWidth: number,
  widthOf: (value: string) => number,
): string[] {
  if (widthOf(line) <= maxWidth || line.length === 0) return [line];
  const words = line.split(/(\s+)/);
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current + word;
    if (current && widthOf(next) > maxWidth) {
      rows.push(current);
      current = word.trimStart();
      continue;
    }
    current = next;
  }
  if (current) rows.push(current);
  return rows.flatMap((row) => splitLongToken(row, maxWidth, widthOf));
}

function splitLongToken(
  token: string,
  maxWidth: number,
  widthOf: (value: string) => number,
): string[] {
  if (widthOf(token) <= maxWidth || token.length <= 1) return [token];
  const parts: string[] = [];
  let current = "";
  for (const char of token) {
    const next = current + char;
    if (current && widthOf(next) > maxWidth) {
      parts.push(current);
      current = char;
      continue;
    }
    current = next;
  }
  if (current) parts.push(current);
  return parts;
}

export function measureText(
  text: string,
  font: FontSpec,
  maxWidth: number,
  measurer: TextMeasurer,
): MeasuredText {
  const widthOf = (value: string) => measurer.measure(value, font).width;
  const lines: TextLine[] = [];
  const rawLines = text.replaceAll("\r\n", "\n").split("\n");
  for (const raw of rawLines) {
    for (const wrapped of wrapLine(raw, maxWidth, widthOf)) {
      lines.push({
        text: wrapped,
        width: widthOf(wrapped),
        height: font.lineHeight,
      });
    }
  }
  if (lines.length === 0) {
    lines.push({ text: "", width: 0, height: font.lineHeight });
  }
  return {
    lines,
    width: Math.max(0, ...lines.map((line) => line.width)),
    height: lines.reduce((sum, line) => sum + line.height, 0),
  };
}
