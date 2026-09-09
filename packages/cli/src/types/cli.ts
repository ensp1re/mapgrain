import type { ExportFormat } from "@mapgrain/renderer";
import type { CLI_COMMAND, DIAGNOSTIC_CODE, DOCTOR_CHECK } from "../constants/cli.ts";

export type CliCommand = (typeof CLI_COMMAND)[keyof typeof CLI_COMMAND];
export type DiagnosticCode = (typeof DIAGNOSTIC_CODE)[keyof typeof DIAGNOSTIC_CODE];
export type DoctorCheckId = (typeof DOCTOR_CHECK)[keyof typeof DOCTOR_CHECK];

export interface CliIo {
  stdout: { write(chunk: string | Uint8Array): void };
  stderr: { write(chunk: string | Uint8Array): void };
  readFile(path: string): Promise<string>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  rename?(from: string, to: string): Promise<void>;
  unlink?(path: string): Promise<void>;
  stdin?: () => Promise<string>;
  exists?: (path: string) => Promise<boolean>;
}

export interface DiagnosticIssue {
  code: DiagnosticCode | string;
  message: string;
  path: string;
  elementId: string | null;
}

export interface DoctorCheck {
  id: DoctorCheckId;
  ok: boolean;
  message: string;
}

export type ParsedArgs =
  | { ok: true; command: "help" }
  | { ok: true; command: "version" }
  | { ok: true; command: "doctor" }
  | { ok: true; command: "validate"; file: string }
  | { ok: true; command: "render"; file: string; out: string | null; noClobber: boolean }
  | {
      ok: true;
      command: "export";
      file: string;
      format: ExportFormat;
      out: string | null;
      noClobber: boolean;
      viewId?: string;
      lang?: string;
    }
  | { ok: true; command: "view"; file: string; out: string | null; noClobber: boolean; lang?: string }
  | { ok: true; command: "layout"; file: string; out: string | null; noClobber: boolean; rearrange: boolean }
  | { ok: true; command: "studio"; file: string }
  | { ok: true; command: "diagnose"; file: string; strict: boolean }
  | { ok: true; command: "compare"; file: string; other: string; out: string | null; noClobber: boolean }
  | {
      ok: true;
      command: "watch";
      file: string;
      out: string | null;
      format: "json" | "html" | "svg" | "png";
      once: boolean;
    }
  | { ok: false; errors: DiagnosticIssue[] };
