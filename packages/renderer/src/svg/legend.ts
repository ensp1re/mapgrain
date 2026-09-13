import { DOCUMENT_KIND, type NodeKind, type Theme } from "@mapgrain/document";
import { kindLegendLabel, presentKinds, type Scene } from "@mapgrain/scene";
import { COLOR_MODE, type ColorMode } from "../constants/paint.ts";
import { fillForNodeKind } from "../constants/kindFill.ts";
import { escapeXml, n } from "./escape.ts";

const SWATCH = 10;
const GAP = 14;
const ROW = 20;
const CHAR = 6.5;
/** The legend reads as a panel, the way it does in the editor, not as text loose on the page. */
const PAD_X = 10;
const PAD_Y = 8;

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
  return { width: rowWidth + PAD_X * 2, height: y + ROW + PAD_Y * 2 };
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
  panel?: { fill: string; border: string },
): string {
  if (kinds.length === 0) return "";
  const items: string[] = [];
  const box = legendSize(kinds, maxWidth);
  let x = originX + PAD_X;
  let y = originY + PAD_Y;
  for (const kind of kinds) {
    const label = kindLegendLabel(kind);
    const width = SWATCH + 6 + Math.ceil(label.length * CHAR);
    if (x > originX + PAD_X && x + width > originX + PAD_X + maxWidth) {
      x = originX + PAD_X;
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
  const frame = panel
    ? `<rect x="${n(originX)}" y="${n(originY)}" width="${n(box.width)}" height="${n(box.height)}" rx="8" fill="${panel.fill}" stroke="${panel.border}" stroke-width="1"/>`
    : "";
  return `<g data-kind="legend">${frame}
${items.join("\n")}</g>`;
}
