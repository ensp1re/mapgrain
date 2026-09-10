export const NODE_SHAPE = {
  PROCESS: "process",
  STORE: "store",
  ENTITY: "entity",
} as const;

export type NodeShape = (typeof NODE_SHAPE)[keyof typeof NODE_SHAPE];
