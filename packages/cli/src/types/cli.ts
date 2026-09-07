import type { ExportFormat } from "@mapgrain/renderer";
import type { CLI_COMMAND, DIAGNOSTIC_CODE } from "../constants/cli.ts";

export type CliCommand = (typeof CLI_COMMAND)[keyof typeof CLI_COMMAND];
export type DiagnosticCode = (typeof DIAGNOSTIC_CODE)[keyof typeof DIAGNOSTIC_CODE];

export interface CliIo {
  stdout: { write(chunk: string | Uint8Array): void };
  stderr: { write(chunk: string | Uint8Array): void };
  readFile(path: string): Promise<string>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  rename?(from: string, to: string): Promise<void>;
}

export interface DiagnosticIssue {
  code: DiagnosticCode | string;
  message: string;
  path: string;
  elementId: string | null;
}

export type ParsedArgs =
  | { ok: true; command: "validate"; file: string }
  | { ok: true; command: "render"; file: string; out: string | null }
  | { ok: true; command: "export"; file: string; format: ExportFormat; out: string | null }
  | { ok: true; command: "view"; file: string; out: string | null }
  | { ok: false; errors: DiagnosticIssue[] };
