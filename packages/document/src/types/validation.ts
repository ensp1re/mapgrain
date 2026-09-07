import type { VALIDATION_ERROR_CODE } from "../constants/errors.ts";
import type { DiagramDocument } from "./document.ts";

export type ValidationErrorCode =
  (typeof VALIDATION_ERROR_CODE)[keyof typeof VALIDATION_ERROR_CODE];

export interface ValidationIssue {
  code: ValidationErrorCode;
  message: string;
  path: string;
  elementId: string | null;
}

export type ValidationResult =
  | { ok: true; document: DiagramDocument }
  | { ok: false; errors: ValidationIssue[] };
