import type { EXAMPLE_KIND, JOB_STAGE, JOB_STATUS, REPAIR_ACTION } from "../constants/create.ts";
import type { EditorSnapshot } from "./editor.ts";

export type JobStage = (typeof JOB_STAGE)[keyof typeof JOB_STAGE];
export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
export type RepairAction = (typeof REPAIR_ACTION)[keyof typeof REPAIR_ACTION];

export interface ExampleSpec {
  id: string;
  kind: typeof EXAMPLE_KIND;
  title: string;
  blurb: string;
  document: unknown;
}

export interface CreateJobResult {
  status: Exclude<JobStatus, "idle" | "running">;
  prompt: string;
  stage: JobStage;
  message?: string;
  repair?: RepairAction;
}

export type WorkspaceSurface = "start" | "editor";

export interface OpenSnapshot {
  snapshot: EditorSnapshot;
}
