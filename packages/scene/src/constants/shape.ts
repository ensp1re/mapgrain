export const NODE_SHAPE = {
  PROCESS: "process",
  STORE: "store",
  ENTITY: "entity",
  DECISION: "decision",
  TERMINAL: "terminal",
} as const;

export type NodeShape = (typeof NODE_SHAPE)[keyof typeof NODE_SHAPE];

/** A diamond only fits its label if the box grows around it. */
export const DECISION_SCALE_X = 1.35;
export const DECISION_SCALE_Y = 1.5;
