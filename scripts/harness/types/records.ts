import type {
  ATTEMPT_STATUS,
  CHECK_RUN_STATUS,
  SCHEMA_VERSION,
  TASK_STATE,
} from "../constants/states.ts";

export type SchemaVersion = typeof SCHEMA_VERSION;
export type TaskState = (typeof TASK_STATE)[keyof typeof TASK_STATE];
export type CheckRunStatus =
  (typeof CHECK_RUN_STATUS)[keyof typeof CHECK_RUN_STATUS];
export type AttemptStatus = (typeof ATTEMPT_STATUS)[keyof typeof ATTEMPT_STATUS];

export interface CheckConfig {
  id: string;
  argv: string[];
  cwd: string;
  timeoutSeconds: number;
  required: boolean;
}

export interface DeliveryConfig {
  provider: "github";
  defaultBranch: string;
  requirePR: boolean;
}

export interface HarnessConfig {
  schemaVersion: SchemaVersion;
  checks: CheckConfig[];
  fingerprintPaths: string[];
  delivery: DeliveryConfig;
}

export interface TaskEvidence {
  status: "passed" | "failed";
  attemptId: string;
  fingerprintBefore?: string;
  fingerprintAfter?: string;
  checks?: Array<{ id: string; status: string }>;
  verifiedAt?: string;
  failure?: unknown;
}

export interface DeliveryEvidence {
  implementationRevision: string;
  remote: string | null;
  prUrl: string | null;
  checkRuns: Array<{
    name: string;
    revision: string | null;
    conclusion: string | null;
    url: string | null;
  }>;
  observedAt: string;
  closeoutRevision?: string;
}

export interface TaskRecord {
  id: string;
  behavior: string;
  acceptance: string[];
  dependsOn: string[];
  state: TaskState;
  spec: string | null;
  plan: string | null;
  verification: string[];
  blockedReason: string | null;
  evidence: TaskEvidence | null;
  delivery: DeliveryEvidence | null;
}

export interface TaskStateFile {
  schemaVersion: SchemaVersion;
  nextId: number;
  tasks: TaskRecord[];
}

export interface GitFacts {
  available: boolean;
  branch: string | null;
  revision: string | null;
  dirty: boolean | null;
}

export interface HandoffRecord {
  schemaVersion: SchemaVersion;
  taskId: string | null;
  plan: string | null;
  git: GitFacts | null;
  evidenceRefs: string[];
  decisions: string[];
  rejectedApproaches: string[];
  blockers: string[];
  nextAction: string;
  updatedAt: string;
}

export interface CheckAttemptResult {
  id: string;
  argv: string[];
  cwd: string;
  status: CheckRunStatus;
  exitCode: number | null;
  logPath: string;
  error?: string;
}

export interface AttemptRecord {
  schemaVersion: SchemaVersion;
  id: string;
  taskId: string;
  status: AttemptStatus;
  startedAt: string;
  endedAt: string | null;
  fingerprintBefore: string | null;
  fingerprintAfter: string | null;
  checks: CheckAttemptResult[];
  runtime: { node: string };
  errors: string[];
}

export interface ArchiveRecord {
  schemaVersion: SchemaVersion;
  task: TaskRecord;
  archivedAt: string;
}

export interface CommandResult {
  payload: Record<string, unknown>;
  exitCode: number;
}

export interface FingerprintResult {
  digest: string;
  files: Array<{ path: string; sha256: string }>;
}

export interface LoadedState {
  config: HarnessConfig;
  tasks: TaskStateFile;
  handoff: HandoffRecord | null;
}
