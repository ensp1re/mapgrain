import {
  DOCUMENT_KIND,
  EDGE_DIRECTION,
  LAYOUT_DIRECTION,
  NODE_KIND,
  validateDocument,
  type DiagramDocument,
  type PortSide,
} from "@mapgrain/document";
import { ICON_GAP, KIND_TITLE_GAP, PARALLEL_EDGE_OFFSET } from "./constants/metrics.ts";
import { edgeCaption } from "./caption.ts";
import { expandTop, inflate, midpoint, normalize, unionRects } from "./geometry.ts";
import { iconSizeFor, kindDisplayText, kindFontFor } from "./kind.ts";
import { placeEdgeLabel } from "./routes.ts";
import { defaultSceneOptions } from "./options.ts";
import { presentationFromOptions } from "./presentation.ts";
import { presetOverrides } from "./presets.ts";
import {
  isSequenceDocument,
  SEQUENCE_MESSAGE_GAP,
  sequenceMessageY,
  sequencePositions,
} from "./sequence.ts";
import {
  facingSide,
  placePortsOnRect,
  synthesizedPortId,
} from "./ports.ts";
import { measureText } from "./text.ts";
import type { Point, Rect } from "./types/geometry.ts";
import type { SceneOptions } from "./types/options.ts";
import type {
  Scene,
  SceneEdge,
  SceneGroup,
  SceneFragment,
  SceneLifeline,
  SceneNode,
  ScenePort,
  SceneResult,
} from "./types/scene.ts";

function sequenceMessagePoints(
  source: SceneNode,
  target: SceneNode,
  order: number,
  headerBottom: number,
): Point[] {
  const y = sequenceMessageY(order, headerBottom);
  const fromX = source.rect.x + source.rect.width / 2;
  const toX = target.rect.x + target.rect.width / 2;
  if (source.id === target.id) {
    return [
      { x: fromX, y },
      { x: fromX + 28, y },
      { x: fromX + 28, y: y + 16 },
      { x: fromX, y: y + 16 },
    ];
  }
  return [
    { x: fromX, y },
    { x: toX, y },
  ];
}

const FRAGMENT_HEADER = 18;
const FRAGMENT_PAD_X = 16;

function buildFragments(
  document: DiagramDocument,
  nodes: SceneNode[],
  headerBottom: number,
): SceneFragment[] {
  if (document.kind !== DOCUMENT_KIND.SEQUENCE || nodes.length === 0) return [];
  const minX = Math.min(...nodes.map((node) => node.rect.x)) - FRAGMENT_PAD_X;
  const maxX = Math.max(...nodes.map((node) => node.rect.x + node.rect.width)) + FRAGMENT_PAD_X;
  const padY = SEQUENCE_MESSAGE_GAP / 2;
  return (document.fragments ?? []).map((fragment) => {
    const operands = fragment.operands.map((operand) => {
      const top = sequenceMessageY(operand.startOrder, headerBottom) - padY;
      const bottom = sequenceMessageY(operand.endOrder, headerBottom) + padY;
      return { label: operand.label, y: top, height: Math.max(SEQUENCE_MESSAGE_GAP, bottom - top) };
    });
    const y = Math.min(...operands.map((operand) => operand.y));
    const bottom = Math.max(...operands.map((operand) => operand.y + operand.height));
    const first = fragment.operands[0]?.label ?? "";
    return {
      id: fragment.id,
      kind: fragment.kind,
      title: `${fragment.kind} ${first}`.trim(),
      rect: {
        x: minX,
        y: y - FRAGMENT_HEADER,
        width: maxX - minX,
        height: bottom - y + FRAGMENT_HEADER,
      },
      operands,
    };
  });
}

function nodeSize(
  label: { width: number; height: number },
  kind: { width: number; height: number },
  iconSize: number,
  options: SceneOptions,
  hideKindRow: boolean,
): { width: number; height: number } {
  if (hideKindRow) {
    return {
      width: Math.max(options.minNodeWidth, label.width + options.padding.x * 2),
      height: Math.max(options.minNodeHeight, label.height + options.padding.y * 2),
    };
  }
  const kindRow = Math.max(iconSize, kind.height);
  const headerWidth = iconSize + ICON_GAP + kind.width;
  const contentWidth = Math.max(label.width, headerWidth);
  return {
    width: Math.max(options.minNodeWidth, contentWidth + options.padding.x * 2),
    height: Math.max(
      options.minNodeHeight,
      kindRow + KIND_TITLE_GAP + label.height + options.padding.y * 2,
    ),
  };
}

function placeNodes(
  document: DiagramDocument,
  sizes: Map<string, { width: number; height: number }>,
  options: SceneOptions,
): Map<string, Point> {
  const positions = new Map<string, Point>();
  let cursorX = 0;
  let cursorY = 0;
  const horizontal = options.direction === LAYOUT_DIRECTION.RIGHT;

  for (const node of document.nodes) {
    const given = options.positions[node.id];
    if (given) {
      positions.set(node.id, { x: given.x, y: given.y });
      continue;
    }
    const size = sizes.get(node.id) ?? { width: options.minNodeWidth, height: options.minNodeHeight };
    positions.set(node.id, { x: cursorX, y: cursorY });
    if (horizontal) {
      cursorX += size.width + options.spacing.x;
    } else {
      cursorY += size.height + options.spacing.y;
    }
  }
  return positions;
}

function ensurePort(node: SceneNode, side: PortSide): ScenePort {
  const existing = node.ports.find((port) => port.side === side);
  if (existing) return existing;
  const id = synthesizedPortId(node.id, side);
  const already = node.ports.find((port) => port.id === id);
  if (already) return already;
  const placed = placePortsOnRect(node.id, node.rect, [
    ...node.ports.map((port) => ({ id: port.id, side: port.side })),
    { id, side },
  ]);
  node.ports = placed;
  const created = placed.find((port) => port.id === id);
  if (!created) throw new Error(`failed to place port ${id}`);
  return created;
}

function resolvePort(
  node: SceneNode,
  portId: string | undefined,
  toward: Rect,
): ScenePort {
  if (portId) {
    const listed = node.ports.find((port) => port.id === portId);
    if (listed) return listed;
  }
  return ensurePort(node, facingSide(node.rect, toward));
}

function offsetEdge(start: Point, end: Point, index: number, count: number): Point[] {
  if (count <= 1) return [start, end];
  const mid = midpoint(start, end);
  const along = normalize({ x: end.x - start.x, y: end.y - start.y });
  const normal = { x: -along.y, y: along.x };
  const t = index - (count - 1) / 2;
  return [
    start,
    {
      x: mid.x + normal.x * t * PARALLEL_EDGE_OFFSET,
      y: mid.y + normal.y * t * PARALLEL_EDGE_OFFSET,
    },
    end,
  ];
}

function pairKey(source: string, target: string): string {
  return source < target ? `${source}::${target}` : `${target}::${source}`;
}

function buildGroups(document: DiagramDocument, nodes: SceneNode[], options: SceneOptions): SceneGroup[] {
  const nodeByGroup = new Map<string, SceneNode[]>();
  for (const node of nodes) {
    if (!node.groupId) continue;
    const list = nodeByGroup.get(node.groupId) ?? [];
    list.push(node);
    nodeByGroup.set(node.groupId, list);
  }

  const remaining = new Map(document.groups.map((group) => [group.id, group]));
  const done = new Map<string, SceneGroup>();

  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter(
      (group) =>
        !document.groups.some(
          (other) => other.parentId === group.id && remaining.has(other.id),
        ),
    );
    const batch = ready.length > 0 ? ready : [[...remaining.values()][0]].filter(Boolean);
    for (const group of batch) {
      if (!group) continue;
      const label = measureText(group.label, options.font, options.maxLabelWidth, options.measurer);
      const childRects: Rect[] = [
        ...(nodeByGroup.get(group.id) ?? []).map((node) => node.rect),
        ...document.groups
          .filter((other) => other.parentId === group.id)
          .map((other) => done.get(other.id)?.rect)
          .filter((rect): rect is Rect => Boolean(rect)),
      ];
      const inner =
        childRects.length > 0
          ? inflate(unionRects(childRects), options.groupPadding)
          : {
              x: 0,
              y: 0,
              width: Math.max(options.minNodeWidth, label.width + options.groupPadding * 2),
              height: Math.max(options.minNodeHeight, label.height + options.groupPadding * 2),
            };
      done.set(group.id, {
        id: group.id,
        label,
        parentId: group.parentId,
        rect: expandTop(inner, options.groupHeader),
      });
      remaining.delete(group.id);
    }
  }

  return document.groups.map((group) => {
    const built = done.get(group.id);
    if (!built) throw new Error(`missing scene group ${group.id}`);
    return built;
  });
}

export function buildScene(input: unknown, optionOverrides: Partial<SceneOptions> = {}): SceneResult {
  const validated = validateDocument(input);
  if (!validated.ok) return validated;
  const document = validated.document;
  const options = defaultSceneOptions({
    direction: document.layoutHints.direction,
    positions: document.layout?.positions ?? {},
    ...presetOverrides(document.preset),
    ...optionOverrides,
  });

  const sizes = new Map<string, { width: number; height: number }>();
  const labels = new Map<string, ReturnType<typeof measureText>>();
  const kinds = new Map<string, ReturnType<typeof measureText>>();
  const kindFont = kindFontFor(options.font);
  const iconSize = iconSizeFor(options.font);
  const presentation = presentationFromOptions(options);
  for (const node of document.nodes) {
    const label = measureText(node.label, options.font, options.maxLabelWidth, options.measurer);
    const kind = measureText(
      kindDisplayText(node.kind),
      kindFont,
      options.maxLabelWidth,
      options.measurer,
    );
    labels.set(node.id, label);
    kinds.set(node.id, kind);
    sizes.set(node.id, nodeSize(label, kind, iconSize, options, node.kind === NODE_KIND.STATE));
  }

  const positions = isSequenceDocument(document)
    ? sequencePositions(document, sizes)
    : placeNodes(document, sizes, options);
  for (const [id, point] of Object.entries(options.positions)) {
    positions.set(id, point);
  }
  const nodes: SceneNode[] = document.nodes.map((node) => {
    const size = sizes.get(node.id) ?? { width: options.minNodeWidth, height: options.minNodeHeight };
    const origin = positions.get(node.id) ?? { x: 0, y: 0 };
    const rect = { x: origin.x, y: origin.y, width: size.width, height: size.height };
    const label = labels.get(node.id) ?? measureText(node.label, options.font, options.maxLabelWidth, options.measurer);
    const kindLabel =
      kinds.get(node.id) ??
      measureText(kindDisplayText(node.kind), kindFont, options.maxLabelWidth, options.measurer);
    return {
      id: node.id,
      kind: node.kind,
      kindLabel,
      label,
      rect,
      groupId: node.groupId,
      marker: node.marker,
      role: node.role,
      iconSize,
      ports: placePortsOnRect(node.id, rect, node.ports),
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const pairCounts = new Map<string, number>();
  const pairSeen = new Map<string, number>();
  for (const edge of document.edges) {
    const key = pairKey(edge.source.nodeId, edge.target.nodeId);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  const edges: SceneEdge[] = document.edges.map((edge) => {
    const sourceNode = nodeById.get(edge.source.nodeId);
    const targetNode = nodeById.get(edge.target.nodeId);
    if (!sourceNode || !targetNode) {
      const empty = { lines: [], width: 0, height: 0 };
      return {
        id: edge.id,
        source: { nodeId: edge.source.nodeId, portId: edge.source.portId ?? "" },
        target: { nodeId: edge.target.nodeId, portId: edge.target.portId ?? "" },
        points: [],
        direction: edge.direction ?? EDGE_DIRECTION.FORWARD,
        caption: "",
        label: empty,
        labelAnchor: { x: 0, y: 0 },
        labelBox: { x: 0, y: 0, width: 0, height: 0 },
      };
    }
    const sourcePort = resolvePort(sourceNode, edge.source.portId, targetNode.rect);
    const targetPort = resolvePort(targetNode, edge.target.portId, sourceNode.rect);
    const key = pairKey(sourceNode.id, targetNode.id);
    const count = pairCounts.get(key) ?? 1;
    const index = pairSeen.get(key) ?? 0;
    pairSeen.set(key, index + 1);
    const headerBottom = Math.max(
      ...nodes.map((item) => item.rect.y + item.rect.height),
      sourceNode.rect.y + sourceNode.rect.height,
    );
    const points =
      document.kind === DOCUMENT_KIND.SEQUENCE
        ? sequenceMessagePoints(sourceNode, targetNode, edge.order ?? index + 1, headerBottom)
        : offsetEdge(
            { x: sourcePort.x, y: sourcePort.y },
            { x: targetPort.x, y: targetPort.y },
            index,
            count,
          );
    const extra =
      edge.outcome ?? edge.guard ?? (edge.order !== undefined ? String(edge.order) : undefined);
    const caption = edgeCaption(edge.type, edge.label, extra);
    const label = measureText(caption || " ", options.font, options.maxLabelWidth, options.measurer);
    const placed = placeEdgeLabel(points, caption ? label : { width: 0, height: 0 });
    return {
      id: edge.id,
      source: { nodeId: sourceNode.id, portId: sourcePort.id },
      target: { nodeId: targetNode.id, portId: targetPort.id },
      points,
      direction: edge.direction ?? EDGE_DIRECTION.FORWARD,
      caption,
      label,
      labelAnchor: placed.anchor,
      labelBox: placed.box,
    };
  });

  const groups = buildGroups(document, nodes, options);
  const messageBottom = Math.max(
    0,
    ...edges.flatMap((edge) => edge.points.map((point) => point.y)),
  );
  const headerBottom = Math.max(0, ...nodes.map((item) => item.rect.y + item.rect.height));
  const lifelines: SceneLifeline[] =
    document.kind === DOCUMENT_KIND.SEQUENCE
      ? nodes.map((node) => ({
          nodeId: node.id,
          x: node.rect.x + node.rect.width / 2,
          y1: node.rect.y + node.rect.height,
          y2: Math.max(node.rect.y + node.rect.height + 48, messageBottom + 24),
        }))
      : [];
  const fragments = buildFragments(document, nodes, headerBottom);
  const bounds = unionRects([
    ...nodes.map((node) => node.rect),
    ...groups.map((group) => group.rect),
    ...fragments.map((fragment) => fragment.rect),
    ...edges.flatMap((edge) => [
      ...edge.points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
      edge.labelBox,
    ]),
    ...lifelines.map((line) => ({ x: line.x, y: line.y1, width: 0, height: line.y2 - line.y1 })),
  ]);

  const scene: Scene = {
    documentId: document.id,
    revision: document.revision,
    bounds,
    nodes,
    edges,
    groups,
    lifelines,
    fragments,
    presentation,
  };
  return { ok: true, scene };
}
