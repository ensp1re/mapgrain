import { EDGE_DIRECTION, type Theme } from "@mapgrain/document";
import {
  KIND_FONT_SIZE,
  KIND_LINE_HEIGHT,
  defaultFont,
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

  const groups = scene.groups
    .map(
      (group) =>
        `<g data-kind="group" data-id="${escapeXml(group.id)}">
  <rect x="${n(group.rect.x + ox)}" y="${n(group.rect.y + oy)}" width="${n(group.rect.width)}" height="${n(group.rect.height)}" rx="${GROUP_RADIUS}" fill="none" stroke="${tokens.group}" stroke-width="1"/>
  <text x="${n(group.rect.x + ox + 12)}" y="${n(group.rect.y + oy + 16)}" fill="${tokens.muted}" font-family="${escapeXml(font.family)}" font-size="12">${escapeXml(group.label.lines[0]?.text ?? group.id)}</text>
</g>`,
    )
    .join("\n");

  const edges = scene.edges
    .map((edge) => {
      const pts = edge.points.map((point) => `${n(point.x + ox)},${n(point.y + oy)}`).join(" ");
      const from = edge.points.at(-2);
      const to = edge.points.at(-1);
      const start = edge.points.at(0);
      const second = edge.points.at(1);
      const head =
        edge.direction !== EDGE_DIRECTION.NONE && from && to
          ? arrow({ x: from.x + ox, y: from.y + oy }, { x: to.x + ox, y: to.y + oy })
          : "";
      const tail =
        edge.direction === EDGE_DIRECTION.BOTH && start && second
          ? arrow({ x: second.x + ox, y: second.y + oy }, { x: start.x + ox, y: start.y + oy })
          : "";
      return `<g data-kind="edge" data-id="${escapeXml(edge.id)}" data-direction="${escapeXml(edge.direction)}" fill="${tokens.edge}" stroke="${tokens.edge}">
  <polyline points="${pts}" fill="none" stroke-width="1.5"/>
  ${head}
  ${tail}
</g>`;
    })
    .join("\n");

  const nodes = scene.nodes
    .map((node) => {
      const textX = node.rect.x + ox + node.rect.width / 2;
      const blockHeight = KIND_LINE_HEIGHT + node.label.height;
      const textY = node.rect.y + oy + (node.rect.height - blockHeight) / 2;
      const kind = `<text x="${n(textX)}" y="${n(textY)}" text-anchor="middle" dominant-baseline="hanging" fill="${tokens.muted}" font-family="${escapeXml(font.family)}" font-size="${KIND_FONT_SIZE}">${escapeXml(node.kind)}</text>`;
      const lines = node.label.lines
        .map(
          (line, index) =>
            `<text x="${n(textX)}" y="${n(textY + KIND_LINE_HEIGHT + index * line.height)}" text-anchor="middle" dominant-baseline="hanging" fill="${tokens.text}" font-family="${escapeXml(font.family)}" font-size="${font.size}">${escapeXml(line.text)}</text>`,
        )
        .join("\n  ");
      const ports = node.ports
        .map(
          (port) =>
            `<circle data-port="${escapeXml(port.id)}" cx="${n(port.x + ox)}" cy="${n(port.y + oy)}" r="${PORT_RADIUS}" fill="${tokens.port}"/>`,
        )
        .join("\n  ");
      return `<g data-kind="node" data-id="${escapeXml(node.id)}" data-node-kind="${escapeXml(node.kind)}">
  <rect x="${n(node.rect.x + ox)}" y="${n(node.rect.y + oy)}" width="${n(node.rect.width)}" height="${n(node.rect.height)}" rx="${NODE_RADIUS}" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1"/>
  ${kind}
  ${lines}
  ${ports}
</g>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<title>${escapeXml(scene.documentId)}</title>
<rect width="100%" height="100%" fill="${tokens.background}"/>
${groups}
${edges}
${nodes}
</svg>`;

  return { svg, width, height };
}
