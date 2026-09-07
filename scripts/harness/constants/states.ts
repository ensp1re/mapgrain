export const SCHEMA_VERSION = 1 as const;

export const TASK_STATE = {
  NOT_STARTED: "not_started",
  ACTIVE: "active",
  BLOCKED: "blocked",
  VERIFIED: "verified",
  PASSING: "passing",
} as const;

export const CHECK_RUN_STATUS = {
  RUNNING: "running",
  PASSED: "passed",
  FAILED: "failed",
  INTERRUPTED: "interrupted",
  TIMEOUT: "timeout",
  MISSING_EXECUTABLE: "missing_executable",
  MISSING_CHECK: "missing_check",
} as const;

export const ATTEMPT_STATUS = {
  RUNNING: "running",
  PASSED: "passed",
  FAILED: "failed",
  INTERRUPTED: "interrupted",
} as const;
