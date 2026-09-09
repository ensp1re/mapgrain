import { DOCUMENT_KIND, type NodeKind, type Theme } from "@mapgrain/document";
import { kindLegendLabel, presentKinds, type Scene } from "@mapgrain/scene";
import { COLOR_MODE, type ColorMode } from "../constants/paint.ts";
import { fillForNodeKind } from "../constants/kindFill.ts";
import { escapeXml, n } from "./escape.ts";

const SWATCH = 10;
const GAP = 14;
const ROW = 20;
const CHAR = 6.5;

export function architectureKinds(scene: Scene): NodeKind[] {
  if (scene.documentKind !== DOCUMENT_KIND.ARCHITECTURE) return [];
  return presentKinds(scene.nodes.map((node) => node.kind));
}

export function legendSize(kinds: readonly NodeKind[], maxWidth: number): { width: number; height: number } {
  if (kinds.length === 0) return { width: 0, height: 0 };
  let x = 0;
  let y = 0;
  let rowWidth = 0;
  for (const kind of kinds) {
    const width = SWATCH + 6 + Math.ceil(kindLegendLabel(kind).length * CHAR);
    if (x > 0 && x + width > maxWidth) {
      rowWidth = Math.max(rowWidth, x - GAP);
      x = 0;
      y += ROW;
    }
    x += width + GAP;
    rowWidth = Math.max(rowWidth, x - GAP);
  }
  return { width: rowWidth, height: y + ROW };
}

export function legendMarkup(
  kinds: readonly NodeKind[],
  theme: Theme,
  colorMode: ColorMode,
  originX: number,
  originY: number,
  maxWidth: number,
  muted: string,
  fontFamily: string,
): string {
  if (kinds.length === 0) return "";
  const items: string[] = [];
  let x = originX;
  let y = originY;
  for (const kind of kinds) {
    const label = kindLegendLabel(kind);
    const width = SWATCH + 6 + Math.ceil(label.length * CHAR);
    if (x > originX && x + width > originX + maxWidth) {
      x = originX;
      y += ROW;
    }
    const fill = fillForNodeKind(theme, kind, colorMode === COLOR_MODE.THEMED);
    items.push(
      `<g data-legend-kind="${escapeXml(kind)}" transform="translate(${n(x)} ${n(y)})">
  <rect width="${SWATCH}" height="${SWATCH}" rx="2" fill="${fill}" stroke="${muted}" stroke-width="0.75"/>
  <text x="${SWATCH + 6}" y="9" fill="${muted}" stroke="none" font-family="${escapeXml(fontFamily)}" font-size="11">${escapeXml(label)}</text>
</g>`,
    );
    x += width + GAP;
  }
  return `<g data-kind="legend">${items.join("\n")}</g>`;
}
