import { NODE_KIND, type NodeKind } from "@mapgrain/document";
import { ICON_SIZE } from "./constants/metrics.ts";

export const ICON_VIEWBOX = 24;

export type IconShape =
  | { tag: "path"; d: string }
  | { tag: "rect"; x: number; y: number; width: number; height: number; rx?: number }
  | { tag: "circle"; cx: number; cy: number; r: number }
  | { tag: "ellipse"; cx: number; cy: number; rx: number; ry: number };

const STROKE_ICONS: Record<NodeKind, IconShape[]> = {
  [NODE_KIND.SERVICE]: [
    { tag: "rect", x: 4, y: 4, width: 16, height: 7, rx: 2 },
    { tag: "rect", x: 4, y: 13, width: 16, height: 7, rx: 2 },
    { tag: "path", d: "M8 7.5h1.5M8 16.5h1.5" },
  ],
  [NODE_KIND.DATASTORE]: [
    { tag: "ellipse", cx: 12, cy: 6, rx: 8, ry: 3 },
    { tag: "path", d: "M4 6v12c0 4 16 4 16 0V6M4 12c0 4 16 4 16 0" },
  ],
  [NODE_KIND.QUEUE]: [
    { tag: "path", d: "M5 7h14M5 12h14M5 17h14M9 4v6m6 0v6m-6 0v6" },
  ],
  [NODE_KIND.GATEWAY]: [
    { tag: "rect", x: 4, y: 4, width: 16, height: 7, rx: 2 },
    { tag: "rect", x: 4, y: 13, width: 16, height: 7, rx: 2 },
    { tag: "path", d: "M8 7.5h2M8 16.5h2" },
  ],
  [NODE_KIND.ACTOR]: [
    { tag: "circle", cx: 12, cy: 7, r: 3 },
    { tag: "path", d: "M6 20v-2a6 6 0 0 1 12 0v2" },
  ],
  [NODE_KIND.SYSTEM]: [
    { tag: "rect", x: 4, y: 4, width: 16, height: 16, rx: 3 },
    { tag: "path", d: "M4 10h16M10 4v16" },
  ],
  [NODE_KIND.JOB]: [
    { tag: "path", d: "m8 6-5 6 5 6M16 6l5 6-5 6" },
  ],
  [NODE_KIND.EXTERNAL]: [
    { tag: "rect", x: 4, y: 7, width: 12, height: 10, rx: 2 },
    { tag: "path", d: "M14 7V5h6v6h-2M14 10l6-6" },
  ],
  [NODE_KIND.DECISION]: [
    { tag: "path", d: "M12 3 21 12 12 21 3 12Z" },
  ],
  [NODE_KIND.PARTICIPANT]: [
    { tag: "rect", x: 6, y: 3, width: 12, height: 18, rx: 2 },
    { tag: "circle", cx: 12, cy: 9, r: 2.5 },
    { tag: "path", d: "M8.5 18v-1.5a3.5 3.5 0 0 1 7 0V18" },
  ],
  [NODE_KIND.PROCESS]: [
    { tag: "rect", x: 3, y: 6, width: 18, height: 12, rx: 6 },
    { tag: "path", d: "M8 12h8m0 0-2.5-2.5M16 12l-2.5 2.5" },
  ],
  [NODE_KIND.ENTITY]: [
    { tag: "path", d: "M7 3h8l5 5v13H7Z" },
    { tag: "path", d: "M15 3v5h5M10 13h6M10 17h4" },
  ],
  [NODE_KIND.STATE]: [
    { tag: "circle", cx: 12, cy: 12, r: 8 },
    { tag: "circle", cx: 12, cy: 12, r: 4 },
  ],
};

export function iconShapesFor(kind: string): IconShape[] {
  if (kind in STROKE_ICONS) return STROKE_ICONS[kind as NodeKind];
  return STROKE_ICONS[NODE_KIND.SERVICE];
}

export function iconMarkup(kind: string, size = ICON_SIZE): string {
  const inner = iconShapesFor(kind)
    .map((shape) => {
      if (shape.tag === "path") return `<path d="${shape.d}"/>`;
      if (shape.tag === "circle") return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"/>`;
      if (shape.tag === "ellipse") {
        return `<ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}"/>`;
      }
      const rx = shape.rx === undefined ? "" : ` rx="${shape.rx}"`;
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"${rx}/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
