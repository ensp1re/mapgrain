import { DOCUMENT_KIND, type DiagramDocument } from "@mapgrain/document";
import type { Point, Size } from "./types/geometry.ts";

/** Least room between two lifelines, before any caption asks for more. */
const MIN_GAP = 48;
/** Clear space kept either side of a caption that sits between two lifelines. */
const CAPTION_PAD_X = 24;
export const SEQUENCE_MESSAGE_GAP = 40;
export const SEQUENCE_HEADER_GAP = 28;
/** A self-message loops out and back, so its row carries the loop as well as its caption. */
export const SEQUENCE_SELF_REACH = 28;
export const SEQUENCE_SELF_DROP = 16;

export function isSequenceDocument(document: DiagramDocument): boolean {
  return document.kind === DOCUMENT_KIND.SEQUENCE;
}

/** The order a message is drawn at: authored when given, otherwise its position in the file. */
export function messageOrder(edge: { order?: number }, index: number): number {
  return edge.order ?? index + 1;
}

export interface SequenceMessageBox {
  /** Participant ids, in document order. */
  from: string;
  to: string;
  order: number;
  caption: Size;
}

export interface SequenceLayout {
  positions: Map<string, Point>;
  /** Top of each message row, keyed by order. */
  rowY: Map<number, number>;
}

/**
 * Lifelines are spaced to hold the captions between them, and rows are as tall as the caption
 * they carry. A flat gap and a flat pitch are what used to make a busy sequence overlap.
 */
export function sequenceLayout(
  document: DiagramDocument,
  sizes: Map<string, Size>,
  messages: SequenceMessageBox[],
  headerBottom: number,
): SequenceLayout {
  const order = document.nodes.map((node) => node.id);
  const index = new Map(order.map((id, at) => [id, at]));
  const width = (id: string) => (sizes.get(id) ?? { width: 72, height: 36 }).width;
  const gaps = new Array(Math.max(0, order.length - 1)).fill(MIN_GAP) as number[];

  // Widen the columns a message spans until its caption fits between the two lifelines. Short
  // spans are settled first, so a wide caption over many columns does not inflate one of them.
  const spans = messages
    .map((message) => {
      const from = index.get(message.from) ?? 0;
      const to = index.get(message.to) ?? 0;
      return { message, left: Math.min(from, to), right: Math.max(from, to) };
    })
    .filter((span) => span.right > span.left)
    .sort((left, right) => left.right - left.left - (right.right - right.left));

  for (const span of spans) {
    let room = 0;
    for (let at = span.left; at < span.right; at += 1) room += gaps[at] ?? 0;
    for (let at = span.left + 1; at < span.right; at += 1) room += width(order[at] ?? "");
    const needed = span.message.caption.width + CAPTION_PAD_X;
    if (room >= needed) continue;
    const columns = span.right - span.left;
    const share = Math.ceil((needed - room) / columns);
    for (let at = span.left; at < span.right; at += 1) gaps[at] = (gaps[at] ?? 0) + share;
  }

  const positions = new Map<string, Point>();
  let x = 0;
  order.forEach((id, at) => {
    positions.set(id, { x, y: 0 });
    x += width(id) + (gaps[at] ?? MIN_GAP);
  });

  // Rows are as tall as the tallest caption they carry, and a self-message also has to hold
  // the loop it draws below its own line.
  const byOrder = new Map<number, SequenceMessageBox[]>();
  for (const message of messages) {
    const list = byOrder.get(message.order) ?? [];
    list.push(message);
    byOrder.set(message.order, list);
  }
  const rowY = new Map<number, number>();
  let y = headerBottom + SEQUENCE_HEADER_GAP;
  for (const key of [...byOrder.keys()].sort((left, right) => left - right)) {
    rowY.set(key, y);
    const here = byOrder.get(key) ?? [];
    const caption = Math.max(0, ...here.map((message) => message.caption.height));
    const loop = here.some((message) => message.from === message.to) ? SEQUENCE_SELF_DROP : 0;
    y += Math.max(SEQUENCE_MESSAGE_GAP, caption * 2 + loop + SEQUENCE_MESSAGE_GAP / 2);
  }
  return { positions, rowY };
}

/** Falls back to the flat pitch for an order the layout never saw. */
export function sequenceMessageY(
  order: number,
  headerBottom: number,
  rows?: Map<number, number>,
): number {
  const known = rows?.get(order);
  if (known !== undefined) return known;
  return headerBottom + SEQUENCE_HEADER_GAP + (order - 1) * SEQUENCE_MESSAGE_GAP;
}

/**
 * Participant placement without caption measurements, for `mapgrain layout`. The scene always
 * recomputes sequence geometry from the captions it has measured, so this is a starting point
 * for the stored layout, not the geometry that gets drawn.
 */
export function sequencePositions(
  document: DiagramDocument,
  sizes: Map<string, Size>,
): Map<string, Point> {
  return sequenceLayout(document, sizes, [], 0).positions;
}
