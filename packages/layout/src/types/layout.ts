import type { ValidationIssue } from "@mapgrain/document";
import type { Point } from "@mapgrain/scene";
import type { LAYOUT_CONFLICT_CODE, LAYOUT_STATUS } from "../constants/codes.ts";

export type LayoutConflictCode =
  (typeof LAYOUT_CONFLICT_CODE)[keyof typeof LAYOUT_CONFLICT_CODE];

export type LayoutStatus = (typeof LAYOUT_STATUS)[keyof typeof LAYOUT_STATUS];

export interface LayoutConflict {
  code: LayoutConflictCode;
  message: string;
  pinnedNodeIds: string[];
  overlappingNodeIds: string[];
  pins: Record<string, Point>;
}

export interface LayoutRequest {
  document: unknown;
  pins?: Record<string, Point>;
}

export interface LaidOut {
  status: typeof LAYOUT_STATUS.LAID_OUT;
  generation: number;
  threadId: number;
  positions: Record<string, Point>;
}

export interface LayoutConflictResult {
  status: typeof LAYOUT_STATUS.CONFLICT;
  generation: number;
  threadId: number;
  conflict: LayoutConflict;
}

export interface LayoutSuperseded {
  status: typeof LAYOUT_STATUS.SUPERSEDED;
  generation: number;
}

export interface LayoutInvalid {
  status: typeof LAYOUT_STATUS.INVALID;
  generation: number;
  errors: ValidationIssue[];
}

export type LayoutResult = LaidOut | LayoutConflictResult | LayoutSuperseded | LayoutInvalid;

export interface WorkerLayoutRequest {
  id: number;
  document: unknown;
  pins: Record<string, Point>;
}

export interface WorkerLayoutSuccess {
  id: number;
  threadId: number;
  status: typeof LAYOUT_STATUS.LAID_OUT;
  positions: Record<string, Point>;
}

export interface WorkerLayoutConflict {
  id: number;
  threadId: number;
  status: typeof LAYOUT_STATUS.CONFLICT;
  conflict: LayoutConflict;
}

export interface WorkerLayoutInvalid {
  id: number;
  threadId: number;
  status: typeof LAYOUT_STATUS.INVALID;
  errors: ValidationIssue[];
}

export type WorkerLayoutResponse =
  | WorkerLayoutSuccess
  | WorkerLayoutConflict
  | WorkerLayoutInvalid;
