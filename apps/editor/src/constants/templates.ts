export const TEMPLATE_CATEGORY = {
  ARCHITECTURE: "architecture",
  PROCESS: "process",
  SEQUENCE: "sequence",
  DATA: "data",
  STATE: "state",
} as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORY)[keyof typeof TEMPLATE_CATEGORY];

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  [TEMPLATE_CATEGORY.ARCHITECTURE]: "System architecture",
  [TEMPLATE_CATEGORY.PROCESS]: "Process and workflow",
  [TEMPLATE_CATEGORY.SEQUENCE]: "Sequence",
  [TEMPLATE_CATEGORY.DATA]: "Data",
  [TEMPLATE_CATEGORY.STATE]: "State",
};

export const TEMPLATE_CATEGORY_BLURB: Record<TemplateCategory, string> = {
  [TEMPLATE_CATEGORY.ARCHITECTURE]: "Components, boundaries and what calls what.",
  [TEMPLATE_CATEGORY.PROCESS]: "Who does which step, in which order, with which decisions.",
  [TEMPLATE_CATEGORY.SEQUENCE]: "Ordered messages between participants over time.",
  [TEMPLATE_CATEGORY.DATA]: "Where data comes from, what transforms it and where it rests.",
  [TEMPLATE_CATEGORY.STATE]: "The states a thing can be in and the events that move it.",
};

export const TEMPLATE_CATEGORY_ORDER: TemplateCategory[] = [
  TEMPLATE_CATEGORY.ARCHITECTURE,
  TEMPLATE_CATEGORY.PROCESS,
  TEMPLATE_CATEGORY.SEQUENCE,
  TEMPLATE_CATEGORY.DATA,
  TEMPLATE_CATEGORY.STATE,
];

/** Grid the authored positions sit on, so templates open looking deliberate. */
export const TEMPLATE_COLUMN = 260;
export const TEMPLATE_ROW = 140;
