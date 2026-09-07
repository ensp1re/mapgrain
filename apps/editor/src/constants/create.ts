export const JOB_STAGE = {
  INTERPRETING: "interpreting",
  ARRANGING: "arranging",
  CHECKING: "checking",
} as const;

export const JOB_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;

export const REPAIR_ACTION = {
  OPEN_EXAMPLE: "open-example",
  IMPORT: "import",
} as const;

export const EXAMPLE_KIND = "example";
export const JOB_TICK_MS = 400;
