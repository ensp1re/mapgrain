import { PORT_SIDE, type PortSide } from "@mapgrain/document";
import type { Scene, SceneGroup, SceneNode } from "@mapgrain/scene";
import type { FlowEdgeDraft, FlowNodeDraft } from "../types/flow.ts";

export type { FlowEdgeDraft, FlowNodeDraft } from "../types/flow.ts";

function originFor(node: SceneNode, groups: Map<string, SceneGroup>): { x: number; y: number } {
  if (!node.groupId) return { x: node.rect.x, y: node.rect.y };
  const group = groups.get(node.groupId);
  if (!group) return { x: node.rect.x, y: node.rect.y };
  return { x: node.rect.x - group.rect.x, y: node.rect.y - group.rect.y };
}

function groupOrigin(group: SceneGroup, groups: Map<string, SceneGroup>): { x: number; y: number } {
  if (!group.parentId) return { x: group.rect.x, y: group.rect.y };
  const parent = groups.get(group.parentId);
  if (!parent) return { x: group.rect.x, y: group.rect.y };
  return { x: group.rect.x - parent.rect.x, y: group.rect.y - parent.rect.y };
}

export function sceneToFlow(scene: Scene): { nodes: FlowNodeDraft[]; edges: FlowEdgeDraft[] } {
  const groups = new Map(scene.groups.map((group) => [group.id, group]));
  const groupNodes: FlowNodeDraft[] = scene.groups.map((group) => ({
    id: group.id,
    type: "group",
    position: groupOrigin(group, groups),
    parentId: group.parentId ?? undefined,
    width: group.rect.width,
    height: group.rect.height,
    data: {
      label: group.label.lines[0]?.text ?? group.id,
      lines: group.label.lines.map((line) => line.text),
      ports: [],
    },
  }));
  const componentNodes: FlowNodeDraft[] = scene.nodes.map((node) => ({
    id: node.id,
    type: "component",
    position: originFor(node, groups),
    parentId: node.groupId ?? undefined,
    width: node.rect.width,
    height: node.rect.height,
    data: {
      kind: node.kind,
      label: node.label.lines.map((line) => line.text).join(" "),
      lines: node.label.lines.map((line) => line.text),
      ports: node.ports.map((port) => ({ id: port.id, side: port.side })),
    },
  }));
  const edges: FlowEdgeDraft[] = scene.edges.map((edge) => ({
    id: edge.id,
    source: edge.source.nodeId,
    target: edge.target.nodeId,
    sourceHandle: edge.source.portId,
    targetHandle: edge.target.portId,
    points: edge.points,
    direction: edge.direction,
    caption: edge.caption,
    labelAnchor: edge.labelAnchor,
  }));
  return { nodes: [...groupNodes, ...componentNodes], edges };
}

export function handlePosition(side: PortSide): "top" | "bottom" | "left" | "right" {
  switch (side) {
    case PORT_SIDE.NORTH:
      return "top";
    case PORT_SIDE.SOUTH:
      return "bottom";
    case PORT_SIDE.WEST:
      return "left";
    case PORT_SIDE.EAST:
      return "right";
    default: {
      const _never: never = side;
      return _never;
    }
  }
}
