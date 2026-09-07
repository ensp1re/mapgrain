import { EXPORT_FORMAT, type ExportFormat } from "@mapgrain/renderer";
import { CLI_COMMAND, DIAGNOSTIC_CODE, USAGE } from "./constants/cli.ts";
import type { ParsedArgs } from "./types/cli.ts";

function usage(message: string): ParsedArgs {
  return {
    ok: false,
    errors: [{ code: DIAGNOSTIC_CODE.USAGE, message: `${message} ${USAGE}`, path: "/", elementId: null }],
  };
}

function isFormat(value: string): value is ExportFormat {
  return (Object.values(EXPORT_FORMAT) as string[]).includes(value);
}

export function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0];
  if (
    command !== CLI_COMMAND.VALIDATE &&
    command !== CLI_COMMAND.RENDER &&
    command !== CLI_COMMAND.EXPORT &&
    command !== CLI_COMMAND.VIEW
  ) {
    return usage("Unknown command.");
  }
  let file: string | undefined;
  let out: string | null = null;
  let format: ExportFormat | undefined;
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    if (token === "--out" || token === "-o") {
      const value = argv[i + 1];
      if (!value) return usage("Missing value for --out.");
      out = value;
      i += 1;
      continue;
    }
    if (token === "--format" || token === "-f") {
      const value = argv[i + 1];
      if (!value || !isFormat(value)) return usage("Format must be json, svg, png, or html.");
      format = value;
      i += 1;
      continue;
    }
    if (token.startsWith("-")) return usage(`Unknown flag ${token}.`);
    if (file) return usage("Unexpected extra argument.");
    file = token;
  }
  if (!file) return usage("Missing input file.");
  if (command === CLI_COMMAND.VALIDATE) return { ok: true, command, file };
  if (command === CLI_COMMAND.RENDER) return { ok: true, command, file, out };
  if (command === CLI_COMMAND.VIEW) return { ok: true, command, file, out };
  if (!format) return usage("export requires --format.");
  return { ok: true, command, file, format, out };
}
