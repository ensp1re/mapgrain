import { DOCUMENT_KIND, NODE_KIND, PORT_SIDE, type PortSide } from "@mapgrain/document";
import { stateTone, type Scene, type SceneGroup, type SceneNode } from "@mapgrain/scene";
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

function portKey(nodeId: string, portId: string): string {
  return `${nodeId}\0${portId}`;
}

function portRoles(scene: Scene): Map<string, { asSource: boolean; asTarget: boolean }> {
  const roles = new Map<string, { asSource: boolean; asTarget: boolean }>();
  const mark = (nodeId: string, portId: string, field: "asSource" | "asTarget") => {
    const key = portKey(nodeId, portId);
    const current = roles.get(key) ?? { asSource: false, asTarget: false };
    current[field] = true;
    roles.set(key, current);
  };
  for (const edge of scene.edges) {
    mark(edge.source.nodeId, edge.source.portId, "asSource");
    mark(edge.target.nodeId, edge.target.portId, "asTarget");
  }
  return roles;
}

export function sceneToFlow(scene: Scene): {
  nodes: FlowNodeDraft[];
  edges: FlowEdgeDraft[];
  lifelines: Scene["lifelines"];
  fragments: Scene["fragments"];
} {
  const groups = new Map(scene.groups.map((group) => [group.id, group]));
  const sequence = scene.lifelines.length > 0;
  const roles = portRoles(scene);
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
      lane: group.role === "lane",
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
      kindLabel: node.kindLabel.lines[0]?.text ?? node.kind.toUpperCase(),
      description: node.description?.lines.map((line) => line.text).join(" "),
      label: node.label.lines.map((line) => line.text).join(" "),
      lines: node.label.lines.map((line) => line.text),
      marker: node.marker,
      stateTone:
        node.kind === NODE_KIND.STATE
          ? stateTone(node.label.lines.map((line) => line.text).join(" "), node.marker)
          : undefined,
      kindFill:
        scene.documentKind === DOCUMENT_KIND.ARCHITECTURE && node.kind !== NODE_KIND.STATE
          ? node.kind
          : undefined,
      shape: node.shape,
      ports: node.ports.map((port) => {
        const role = roles.get(portKey(node.id, port.id));
        return {
          id: port.id,
          side: port.side,
          asSource: role?.asSource ?? false,
          asTarget: role?.asTarget ?? false,
        };
      }),
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
    labelSize: { width: edge.label.width, height: edge.label.height },
    preserveGeometry: sequence,
  }));
  return {
    nodes: [...groupNodes, ...componentNodes],
    edges,
    lifelines: scene.lifelines,
    fragments: scene.fragments,
  };
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
