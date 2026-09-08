import { EDGE_DIRECTION, type Theme } from "@mapgrain/document";
import {
  KIND_FONT_SIZE,
  KIND_LINE_HEIGHT,
  defaultFont,
  roundedPolylinePath,
  type Point,
  type Scene,
} from "@mapgrain/scene";
import { ARROW_SIZE, GROUP_RADIUS, NODE_RADIUS, PORT_RADIUS, VIEW_PAD } from "../constants/export.ts";
import { tokensFor } from "../constants/tokens.ts";
import { escapeXml, n } from "./escape.ts";

function arrow(from: Point, to: Point): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = {
    x: to.x - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
    y: to.y - ARROW_SIZE * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: to.x - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
    y: to.y - ARROW_SIZE * Math.sin(angle + Math.PI / 6),
  };
  return `<polygon points="${n(to.x)},${n(to.y)} ${n(left.x)},${n(left.y)} ${n(right.x)},${n(right.y)}" />`;
}

export function renderSvg(scene: Scene, theme: Theme): { svg: string; width: number; height: number } {
  const tokens = tokensFor(theme);
  const width = Math.max(1, Math.ceil(scene.bounds.width + VIEW_PAD * 2));
  const height = Math.max(1, Math.ceil(scene.bounds.height + VIEW_PAD * 2));
  const ox = VIEW_PAD - scene.bounds.x;
  const oy = VIEW_PAD - scene.bounds.y;
  const font = defaultFont;
  const bg = "var(--mg-bg, " + tokens.background + ")";
  const surface = "var(--mg-surface, " + tokens.surface + ")";
  const border = "var(--mg-border, " + tokens.border + ")";
  const text = "var(--mg-text, " + tokens.text + ")";
  const muted = "var(--mg-muted, " + tokens.muted + ")";
  const edgeColor = "var(--mg-edge, " + tokens.edge + ")";
  const groupColor = "var(--mg-group, " + tokens.group + ")";
  const port = "var(--mg-port, " + tokens.port + ")";

  const groups = scene.groups
    .map(
      (group) =>
        `<g data-kind="group" data-id="${escapeXml(group.id)}">
  <rect x="${n(group.rect.x + ox)}" y="${n(group.rect.y + oy)}" width="${n(group.rect.width)}" height="${n(group.rect.height)}" rx="${GROUP_RADIUS}" fill="none" stroke="${groupColor}" stroke-width="1"/>
  <text x="${n(group.rect.x + ox + 12)}" y="${n(group.rect.y + oy + 16)}" fill="${muted}" font-family="${escapeXml(font.family)}" font-size="12">${escapeXml(group.label.lines[0]?.text ?? group.id)}</text>
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
        edge.direction !== EDGE_DIRECTION.NONE && from && to ? arrow(from, to) : "";
      const tail =
        edge.direction === EDGE_DIRECTION.BOTH && start && second ? arrow(second, start) : "";
      const caption =
        edge.caption.length > 0
          ? `<rect x="${n(edge.labelBox.x + ox)}" y="${n(edge.labelBox.y + oy)}" width="${n(edge.labelBox.width)}" height="${n(edge.labelBox.height)}" rx="4" fill="${bg}"/>
  <text x="${n(edge.labelAnchor.x + ox)}" y="${n(edge.labelAnchor.y + oy)}" text-anchor="middle" dominant-baseline="middle" fill="${muted}" font-family="${escapeXml(font.family)}" font-size="11">${escapeXml(edge.caption)}</text>`
          : "";
      return `<g data-kind="edge" data-id="${escapeXml(edge.id)}" data-direction="${escapeXml(edge.direction)}" fill="${edgeColor}" stroke="${edgeColor}">
  <path d="${d}" fill="none" stroke-width="1.5"/>
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
      const kind = `<text x="${n(textX)}" y="${n(textY)}" text-anchor="middle" dominant-baseline="hanging" fill="${muted}" font-family="${escapeXml(font.family)}" font-size="${KIND_FONT_SIZE}">${escapeXml(node.kind)}</text>`;
      const lines = node.label.lines
        .map(
          (line, index) =>
            `<text x="${n(textX)}" y="${n(textY + KIND_LINE_HEIGHT + index * line.height)}" text-anchor="middle" dominant-baseline="hanging" fill="${text}" font-family="${escapeXml(font.family)}" font-size="${font.size}">${escapeXml(line.text)}</text>`,
        )
        .join("\n  ");
      const ports = node.ports
        .map(
          (item) =>
            `<circle data-port="${escapeXml(item.id)}" cx="${n(item.x + ox)}" cy="${n(item.y + oy)}" r="${PORT_RADIUS}" fill="${port}"/>`,
        )
        .join("\n  ");
      return `<g data-kind="node" data-id="${escapeXml(node.id)}" data-node-kind="${escapeXml(node.kind)}" tabindex="0" role="img" aria-label="${escapeXml(node.label.lines.map((line) => line.text).join(" ") || node.id)}">
  <rect x="${n(node.rect.x + ox)}" y="${n(node.rect.y + oy)}" width="${n(node.rect.width)}" height="${n(node.rect.height)}" rx="${NODE_RADIUS}" fill="${surface}" stroke="${border}" stroke-width="1"/>
  ${kind}
  ${lines}
  ${ports}
</g>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<title>${escapeXml(scene.documentId)}</title>
<rect class="mg-bg" width="100%" height="100%" fill="${bg}"/>
${groups}
${edges}
${nodes}
</svg>`;

  return { svg, width, height };
}
