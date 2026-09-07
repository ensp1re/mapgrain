import type { Theme } from "@mapgrain/document";
import type { EXPORT_ERROR_CODE, EXPORT_FORMAT } from "../constants/export.ts";

export type ExportFormat = (typeof EXPORT_FORMAT)[keyof typeof EXPORT_FORMAT];
export type ExportErrorCode = (typeof EXPORT_ERROR_CODE)[keyof typeof EXPORT_ERROR_CODE];

export interface ExportIssue {
  code: ExportErrorCode;
  message: string;
  path: string;
  suggestedScale?: number;
  maxPixels?: number;
}

export interface ExportRequest {
  document: unknown;
  format: ExportFormat;
  theme?: Theme;
  scale?: number;
  maxPixels?: number;
  nodeIds?: string[];
  includeEvidence?: boolean;
}

export interface ExportSuccess {
  ok: true;
  format: ExportFormat;
  mediaType: string;
  bytes: Uint8Array;
  width?: number;
  height?: number;
}

export type ExportResult = ExportSuccess | { ok: false; errors: ExportIssue[] };
