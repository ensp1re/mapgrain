import { NODE_SHAPE, type SceneNode } from "@mapgrain/scene";
import { NODE_RADIUS } from "../constants/export.ts";
import { n } from "./escape.ts";

function storeCylinder(x: number, y: number, width: number, height: number, fill: string, border: string): string {
  const ry = Math.min(12, height / 5);
  const cx = x + width / 2;
  const top = y + ry;
  const bottom = y + height - ry;
  return `<path d="M ${n(x)} ${n(top)} L ${n(x)} ${n(bottom)} A ${n(width / 2)} ${n(ry)} 0 0 0 ${n(x + width)} ${n(bottom)} L ${n(x + width)} ${n(top)} A ${n(width / 2)} ${n(ry)} 0 0 1 ${n(x)} ${n(top)} Z" fill="${fill}" stroke="${border}" stroke-width="1"/>
  <ellipse cx="${n(cx)}" cy="${n(top)}" rx="${n(width / 2)}" ry="${n(ry)}" fill="${fill}" stroke="${border}" stroke-width="1"/>`;
}

export function nodeBodyMarkup(node: SceneNode, ox: number, oy: number, fill: string, border: string): string {
  const x = node.rect.x + ox;
  const y = node.rect.y + oy;
  const width = node.rect.width;
  const height = node.rect.height;
  if (node.shape === NODE_SHAPE.STORE) return storeCylinder(x, y, width, height, fill, border);
  if (node.shape === NODE_SHAPE.DECISION) {
    const points = [
      `${n(x + width / 2)},${n(y)}`,
      `${n(x + width)},${n(y + height / 2)}`,
      `${n(x + width / 2)},${n(y + height)}`,
      `${n(x)},${n(y + height / 2)}`,
    ].join(" ");
    return `<polygon points="${points}" fill="${fill}" stroke="${border}" stroke-width="1"/>`;
  }
  const rx =
    node.shape === NODE_SHAPE.PROCESS || node.shape === NODE_SHAPE.TERMINAL
      ? Math.min(width, height) / 2
      : node.shape === NODE_SHAPE.ENTITY
        ? 2
        : NODE_RADIUS;
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" rx="${n(rx)}" fill="${fill}" stroke="${border}" stroke-width="1"/>`;
}
