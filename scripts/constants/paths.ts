export const HARNESS_DIR = "docs";

export const HARNESS_PATHS = {
  config: `${HARNESS_DIR}/config.json`,
  tasks: `${HARNESS_DIR}/tasks.json`,
  handoff: `${HARNESS_DIR}/handoff.json`,
  install: `${HARNESS_DIR}/install.json`,
  handoffView: `${HARNESS_DIR}/SESSION_HANDOFF.md`,
  lock: `${HARNESS_DIR}/state.lock`,
  runs: `${HARNESS_DIR}/runs`,
  archive: `${HARNESS_DIR}/archive`,
} as const;

export const GENERATED_OUTPUT_PREFIXES = [
  HARNESS_PATHS.runs,
  HARNESS_PATHS.archive,
  HARNESS_PATHS.lock,
  "packages/cli/studio",
  "packages/cli/fonts",
] as const;
