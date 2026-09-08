import {
  NODES_FOR_KIND,
  PORT_SIDE,
  type DiagramNode,
  type DocumentKind,
  type NodeKind,
} from "@mapgrain/document";

export function makeNode(id: string, kind: NodeKind, label: string): DiagramNode {
  return {
    id,
    kind,
    label,
    groupId: null,
    ports: [
      { id: "in", side: PORT_SIDE.WEST },
      { id: "out", side: PORT_SIDE.EAST },
    ],
  };
}

export function addableKinds(kind: DocumentKind): NodeKind[] {
  return [...NODES_FOR_KIND[kind]];
}
