import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_LINE_HEIGHT,
  LATIN_WIDTH,
  SPACE_WIDTH,
  WIDE_WIDTH,
} from "./constants/metrics.ts";
import type { FontSpec, TextMeasurer } from "./types/options.ts";
import type { MeasuredText, TextLine } from "./types/scene.ts";

export const approximateTextMeasurer: TextMeasurer = {
  measure(text, font) {
    let width = 0;
    for (const char of text) {
      const code = char.codePointAt(0) ?? 0;
      if (code <= 32) width += font.size * SPACE_WIDTH;
      else if (code < 127) width += font.size * LATIN_WIDTH;
      else width += font.size * WIDE_WIDTH;
    }
    return { width, height: font.lineHeight };
  },
};

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
