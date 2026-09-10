import { LAYOUT_DIRECTION, type DiagramDocument } from "@mapgrain/document";
import type { Size } from "@mapgrain/scene";

export interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

export interface ElkNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkNode[];
  edges?: ElkEdge[];
  layoutOptions?: Record<string, string>;
}

function elkDirection(direction: DiagramDocument["layoutHints"]["direction"]): string {
  return direction === LAYOUT_DIRECTION.DOWN ? "DOWN" : "RIGHT";
}

function childrenOf(
  document: DiagramDocument,
  sizes: Map<string, Size>,
  parentId: string | null,
): ElkNode[] {
  const groups = document.groups.filter((group) => group.parentId === parentId);
  const nodes = document.nodes.filter((node) => node.groupId === parentId);
  return [
    ...groups.map((group) => ({
      id: group.id,
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": elkDirection(document.layoutHints.direction),
        "elk.padding": "[top=46,left=24,bottom=24,right=24]",
        "elk.spacing.nodeNode": "96",
        "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      },
      children: childrenOf(document, sizes, group.id),
    })),
    ...nodes.map((node) => {
      const size = sizes.get(node.id) ?? { width: 72, height: 36 };
      return {
        id: node.id,
        width: size.width,
        height: size.height,
      };
    }),
  ];
}

export function toElkGraph(document: DiagramDocument, sizes: Map<string, Size>): ElkNode {
  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection(document.layoutHints.direction),
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "96",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.edgeLabel": "12",
      "elk.spacing.edgeEdge": "16",
      "elk.layered.mergeEdges": "false",
    },
    children: childrenOf(document, sizes, null),
    edges: document.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source.nodeId],
      targets: [edge.target.nodeId],
    })),
  };
}

export function collectPositions(
  node: ElkNode,
  originX: number,
  originY: number,
  leafIds: Set<string>,
  out: Record<string, { x: number; y: number }>,
): void {
  const x = originX + (node.x ?? 0);
  const y = originY + (node.y ?? 0);
  if (leafIds.has(node.id)) {
    out[node.id] = { x, y };
  }
  for (const child of node.children ?? []) {
    collectPositions(child, x, y, leafIds, out);
  }
}
