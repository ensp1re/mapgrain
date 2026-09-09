import { EDGE_DIRECTION, NODE_MARKER, type Theme } from "@mapgrain/document";
import {
  ICON_VIEWBOX,
  defaultFont,
  iconShapesFor,
  roundedPolylinePath,
  type Point,
  type Scene,
} from "@mapgrain/scene";
import { ARROW_SIZE, GROUP_RADIUS, NODE_RADIUS, PORT_RADIUS, VIEW_PAD } from "../constants/export.ts";
import { COLOR_MODE, paintsFor, type ColorMode } from "../constants/paint.ts";
import { EXPORT_FONT_FAMILY, interFontFaceCss } from "../font.ts";
import { escapeXml, n } from "./escape.ts";

function iconGroup(kind: string, x: number, y: number, size: number, stroke: string): string {
  const scale = size / ICON_VIEWBOX;
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
  return `<g data-icon="${escapeXml(kind)}" transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

function arrow(from: Point, to: Point, fill: string): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = {
    x: to.x - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
    y: to.y - ARROW_SIZE * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: to.x - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
    y: to.y - ARROW_SIZE * Math.sin(angle + Math.PI / 6),
  };
  return `<polygon fill="${fill}" stroke="none" points="${n(to.x)},${n(to.y)} ${n(left.x)},${n(left.y)} ${n(right.x)},${n(right.y)}" />`;
}

export function renderSvg(
  scene: Scene,
  theme: Theme,
  colorMode: ColorMode = COLOR_MODE.RESOLVED,
): { svg: string; width: number; height: number } {
  const paints = paintsFor(theme, colorMode);
  const width = Math.max(1, Math.ceil(scene.bounds.width + VIEW_PAD * 2));
  const height = Math.max(1, Math.ceil(scene.bounds.height + VIEW_PAD * 2));
  const ox = VIEW_PAD - scene.bounds.x;
  const oy = VIEW_PAD - scene.bounds.y;
  const font = { ...defaultFont, family: EXPORT_FONT_FAMILY };
  const { background: bg, surface, border, text, muted, edge: edgeColor, group: groupColor, port } = paints;

  const groups = scene.groups
    .map(
      (group) =>
        `<g data-kind="group" data-id="${escapeXml(group.id)}">
  <rect x="${n(group.rect.x + ox)}" y="${n(group.rect.y + oy)}" width="${n(group.rect.width)}" height="${n(group.rect.height)}" rx="${GROUP_RADIUS}" fill="none" stroke="${groupColor}" stroke-width="1"/>
  <text x="${n(group.rect.x + ox + 12)}" y="${n(group.rect.y + oy + 16)}" fill="${muted}" stroke="none" font-family="${escapeXml(font.family)}" font-weight="${font.weight}" font-size="12">${escapeXml(group.label.lines[0]?.text ?? group.id)}</text>
</g>`,
    )
    .join("\n");

  const edges = scene.edges
    .map((edge) => {
      const shifted = edge.points.map((point) => ({ x: point.x + ox, y: point.y + oy }));
      const d = roundedPolylinePath(shifted);
      const from = shifted.at(-2);
      const to = shifted.at(-1);
      const start = shifted.at(0);
      const second = shifted.at(1);
      const head =
        edge.direction !== EDGE_DIRECTION.NONE && from && to ? arrow(from, to, edgeColor) : "";
      const tail =
        edge.direction === EDGE_DIRECTION.BOTH && start && second ? arrow(second, start, edgeColor) : "";
      const caption =
        edge.caption.length > 0
          ? `<rect x="${n(edge.labelBox.x + ox)}" y="${n(edge.labelBox.y + oy)}" width="${n(edge.labelBox.width)}" height="${n(edge.labelBox.height)}" rx="4" fill="${bg}" stroke="none"/>
  <text x="${n(edge.labelAnchor.x + ox)}" y="${n(edge.labelAnchor.y + oy)}" text-anchor="middle" dominant-baseline="middle" fill="${muted}" stroke="none" font-family="${escapeXml(font.family)}" font-weight="${font.weight}" font-size="11">${escapeXml(edge.caption)}</text>`
          : "";
      return `<g data-kind="edge" data-id="${escapeXml(edge.id)}" data-direction="${escapeXml(edge.direction)}">
  <path d="${d}" fill="none" stroke="${edgeColor}" stroke-width="1.5"/>
  ${head}
  ${tail}
  ${caption}
</g>`;
    })
    .join("\n");

  const presentation = scene.presentation;
  const nodes = scene.nodes
    .map((node) => {
      const padX = presentation.paddingX;
      const padY = presentation.paddingY;
      const originX = node.rect.x + ox + padX;
      const originY = node.rect.y + oy + padY;
      const kindRow = Math.max(node.iconSize, node.kindLabel.height);
      const iconY = originY + (kindRow - node.iconSize) / 2;
      const kindText = node.kindLabel.lines[0]?.text ?? node.kind.toUpperCase();
      const kindX = originX + node.iconSize + presentation.iconGap;
      const kindY = originY + (kindRow - node.kindLabel.height) / 2;
      const titleY = originY + kindRow + presentation.kindTitleGap;
      const icon = iconGroup(node.kind, originX, iconY, node.iconSize, muted);
      const kind = `<text x="${n(kindX)}" y="${n(kindY)}" dominant-baseline="hanging" fill="${muted}" stroke="none" font-family="${escapeXml(font.family)}" font-weight="${font.weight}" font-size="${presentation.kindSize}" letter-spacing="${n(presentation.kindSize * presentation.kindTrackingEm)}">${escapeXml(kindText)}</text>`;
      const lines = node.label.lines
        .map(
          (line, index) =>
            `<text x="${n(originX)}" y="${n(titleY + index * line.height)}" dominant-baseline="hanging" fill="${text}" stroke="none" font-family="${escapeXml(font.family)}" font-weight="${presentation.titleWeight}" font-size="${presentation.titleSize}">${escapeXml(line.text)}</text>`,
        )
        .join("\n  ");
      const ports = node.ports
        .map(
          (item) =>
            `<circle data-port="${escapeXml(item.id)}" cx="${n(item.x + ox)}" cy="${n(item.y + oy)}" r="${PORT_RADIUS}" fill="${port}" stroke="none"/>`,
        )
        .join("\n  ");
      const initial =
        node.marker === NODE_MARKER.INITIAL
          ? `<circle data-marker="initial" cx="${n(node.rect.x + ox - 10)}" cy="${n(node.rect.y + oy + node.rect.height / 2)}" r="5" fill="${border}" stroke="none"/>`
          : "";
      const final =
        node.marker === NODE_MARKER.FINAL
          ? `<rect x="${n(node.rect.x + ox + 3)}" y="${n(node.rect.y + oy + 3)}" width="${n(node.rect.width - 6)}" height="${n(node.rect.height - 6)}" rx="${NODE_RADIUS - 2}" fill="none" stroke="${border}" stroke-width="1"/>`
          : "";
      const roleAttr = node.role ? ` data-role="${escapeXml(node.role)}"` : "";
      const accessible = `${kindText} ${node.label.lines.map((line) => line.text).join(" ")}`.trim();
      return `<g data-kind="node" data-id="${escapeXml(node.id)}" data-node-kind="${escapeXml(node.kind)}"${roleAttr} tabindex="0" role="img" aria-label="${escapeXml(accessible || node.id)}">
  <rect x="${n(node.rect.x + ox)}" y="${n(node.rect.y + oy)}" width="${n(node.rect.width)}" height="${n(node.rect.height)}" rx="${NODE_RADIUS}" fill="${surface}" stroke="${border}" stroke-width="1"/>
  ${final}
  ${initial}
  ${icon}
  ${kind}
  ${lines}
  ${ports}
</g>`;
    })
    .join("\n");

  const lifelines = (scene.lifelines ?? [])
    .map(
      (line) =>
        `<line data-kind="lifeline" data-id="${escapeXml(line.nodeId)}" x1="${n(line.x + ox)}" y1="${n(line.y1 + oy)}" x2="${n(line.x + ox)}" y2="${n(line.y2 + oy)}" stroke="${edgeColor}" stroke-width="1" stroke-dasharray="4 4"/>`,
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<title>${escapeXml(scene.documentId)}</title>
<style><![CDATA[${interFontFaceCss()}]]></style>
<rect class="mg-bg" width="${width}" height="${height}" fill="${bg}"/>
${groups}
${lifelines}
${edges}
${nodes}
</svg>`;

  return { svg, width, height };
}
