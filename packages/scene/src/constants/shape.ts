export const NODE_SHAPE = {
  PROCESS: "process",
  STORE: "store",
  ENTITY: "entity",
  DECISION: "decision",
  TERMINAL: "terminal",
} as const;

export type NodeShape = (typeof NODE_SHAPE)[keyof typeof NODE_SHAPE];

/**
 * A rectangle of w x h fits inside a diamond only when the diamond is 2w x 2h, and only when
 * the content is centred on the diamond's centre. Anything less clips the label on the two
 * upper edges, which is what 1.35 x 1.5 used to do.
 */
export const DECISION_SCALE_X = 2;
export const DECISION_SCALE_Y = 2;

/** A branch label wraps sooner than a card's, so the diamond it needs stays a readable size. */
export const DECISION_LABEL_WIDTH = 104;
