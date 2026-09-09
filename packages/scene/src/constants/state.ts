export const STATE_TONE = {
  START: "start",
  ACTIVE: "active",
  WAIT: "wait",
  FAIL: "fail",
  DONE: "done",
} as const;

export type StateTone = (typeof STATE_TONE)[keyof typeof STATE_TONE];

export const STATE_FAIL_PATTERN =
  /\b(fail|failed|failure|error|cancel|cancelled|canceled|expire|expired|skip|skipped|reject|rejected|abort|aborted)\b/i;

export const STATE_WAIT_PATTERN =
  /\b(wait|waiting|block|blocked|pending|hold|held|pause|paused)\b/i;
