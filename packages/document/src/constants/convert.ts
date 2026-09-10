import type { DocumentKind, NodeKind } from "../types/document.ts";
import { DOCUMENT_KIND, NODE_KIND } from "./document.ts";
import { NODES_FOR_KIND } from "./modes.ts";

const NODE_ALIAS: Record<DocumentKind, Partial<Record<NodeKind, NodeKind>>> = {
  [DOCUMENT_KIND.ARCHITECTURE]: {
    [NODE_KIND.PARTICIPANT]: NODE_KIND.ACTOR,
    [NODE_KIND.PROCESS]: NODE_KIND.SERVICE,
    [NODE_KIND.ENTITY]: NODE_KIND.DATASTORE,
    [NODE_KIND.DECISION]: NODE_KIND.GATEWAY,
    [NODE_KIND.STATE]: NODE_KIND.SYSTEM,
  },
  [DOCUMENT_KIND.WORKFLOW]: {
    [NODE_KIND.PARTICIPANT]: NODE_KIND.ACTOR,
    [NODE_KIND.PROCESS]: NODE_KIND.JOB,
    [NODE_KIND.STATE]: NODE_KIND.JOB,
  },
  [DOCUMENT_KIND.SEQUENCE]: {
    [NODE_KIND.ACTOR]: NODE_KIND.ACTOR,
  },
  [DOCUMENT_KIND.DATA_FLOW]: {
    [NODE_KIND.SERVICE]: NODE_KIND.PROCESS,
    [NODE_KIND.JOB]: NODE_KIND.PROCESS,
    [NODE_KIND.SYSTEM]: NODE_KIND.PROCESS,
    [NODE_KIND.GATEWAY]: NODE_KIND.PROCESS,
    [NODE_KIND.STATE]: NODE_KIND.PROCESS,
  },
  [DOCUMENT_KIND.LIFECYCLE]: {},
};

export function mappedNodeKind(kind: NodeKind, target: DocumentKind): NodeKind | null {
  const allowed = NODES_FOR_KIND[target];
  if (allowed.includes(kind)) return kind;
  const alias = NODE_ALIAS[target]?.[kind];
  if (alias && allowed.includes(alias)) return alias;
  if (target === DOCUMENT_KIND.SEQUENCE) return NODE_KIND.PARTICIPANT;
  if (target === DOCUMENT_KIND.LIFECYCLE) return NODE_KIND.STATE;
  return null;
}
