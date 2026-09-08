import { EDGE_DIRECTION, NODE_MARKER, type Theme } from "@mapgrain/document";
import {
  KIND_FONT_SIZE,
  KIND_LINE_HEIGHT,
  defaultFont,
  roundedPolylinePath,
  type Point,
  type Scene,
} from "@mapgrain/scene";
import { ARROW_SIZE, GROUP_RADIUS, NODE_RADIUS, PORT_RADIUS, VIEW_PAD } from "../constants/export.ts";
import { COLOR_MODE, paintsFor, type ColorMode } from "../constants/paint.ts";
import { EXPORT_FONT_FAMILY, interFontFaceCss } from "../font.ts";
import { escapeXml, n } from "./escape.ts";

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

  const nodes = scene.nodes
    .map((node) => {
      const textX = node.rect.x + ox + node.rect.width / 2;
      const blockHeight = KIND_LINE_HEIGHT + node.label.height;
      const textY = node.rect.y + oy + (node.rect.height - blockHeight) / 2;
      const kind = `<text x="${n(textX)}" y="${n(textY)}" text-anchor="middle" dominant-baseline="hanging" fill="${muted}" stroke="none" font-family="${escapeXml(font.family)}" font-weight="${font.weight}" font-size="${KIND_FONT_SIZE}">${escapeXml(node.kind)}</text>`;
      const lines = node.label.lines
        .map(
          (line, index) =>
            `<text x="${n(textX)}" y="${n(textY + KIND_LINE_HEIGHT + index * line.height)}" text-anchor="middle" dominant-baseline="hanging" fill="${text}" stroke="none" font-family="${escapeXml(font.family)}" font-weight="${font.weight}" font-size="${font.size}">${escapeXml(line.text)}</text>`,
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
      return `<g data-kind="node" data-id="${escapeXml(node.id)}" data-node-kind="${escapeXml(node.kind)}"${roleAttr} tabindex="0" role="img" aria-label="${escapeXml(node.label.lines.map((line) => line.text).join(" ") || node.id)}">
  <rect x="${n(node.rect.x + ox)}" y="${n(node.rect.y + oy)}" width="${n(node.rect.width)}" height="${n(node.rect.height)}" rx="${NODE_RADIUS}" fill="${surface}" stroke="${border}" stroke-width="1"/>
  ${final}
  ${initial}
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
