import {
  NODE_KIND,
  PORT_SIDE,
  type DiagramNode,
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

export const ADDABLE_KINDS: NodeKind[] = [
  NODE_KIND.SERVICE,
  NODE_KIND.DATASTORE,
  NODE_KIND.GATEWAY,
  NODE_KIND.QUEUE,
  NODE_KIND.ACTOR,
  NODE_KIND.JOB,
  NODE_KIND.SYSTEM,
  NODE_KIND.EXTERNAL,
];
