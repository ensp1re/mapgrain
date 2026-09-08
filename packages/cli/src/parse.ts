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
  if (
    argv.length === 0 ||
    argv.includes("--help") ||
    argv.includes("-h") ||
    argv[0] === CLI_COMMAND.HELP
  ) {
    return { ok: true, command: CLI_COMMAND.HELP };
  }
  if (argv.includes("--version") || argv.includes("-v") || argv[0] === CLI_COMMAND.VERSION) {
    return { ok: true, command: CLI_COMMAND.VERSION };
  }

  const command = argv[0];
  if (
    command !== CLI_COMMAND.VALIDATE &&
    command !== CLI_COMMAND.RENDER &&
    command !== CLI_COMMAND.EXPORT &&
    command !== CLI_COMMAND.VIEW &&
    command !== CLI_COMMAND.LAYOUT &&
    command !== CLI_COMMAND.DOCTOR &&
    command !== CLI_COMMAND.DIAGNOSE &&
    command !== CLI_COMMAND.COMPARE &&
    command !== CLI_COMMAND.STUDIO
  ) {
    return usage("Unknown command.");
  }
  if (command === CLI_COMMAND.COMPARE) {
    const files = argv.slice(1).filter((token) => token && !token.startsWith("-"));
    if (files.length !== 2 || !files[0] || !files[1]) return usage("compare needs two files.");
    return { ok: true, command, file: files[0], other: files[1] };
  }
  if (command === CLI_COMMAND.DOCTOR) {
    if (argv.slice(1).some((token) => token.startsWith("-"))) return usage(`Unknown flag ${argv[1]}.`);
    return { ok: true, command };
  }

  let file: string | undefined;
  let out: string | null = null;
  let format: ExportFormat | undefined;
  let noClobber = false;
  let rearrange = false;
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
    if (token === "--no-clobber") {
      noClobber = true;
      continue;
    }
    if (token === "--rearrange") {
      if (command !== CLI_COMMAND.LAYOUT) return usage("Unknown flag --rearrange.");
      rearrange = true;
      continue;
    }
    if (token.startsWith("-") && token !== "-") return usage(`Unknown flag ${token}.`);
    if (file) return usage("Unexpected extra argument.");
    file = token;
  }
  if (!file) return usage("Missing input file.");
  if (command === CLI_COMMAND.VALIDATE) return { ok: true, command, file };
  if (command === CLI_COMMAND.DIAGNOSE) return { ok: true, command, file };
  if (command === CLI_COMMAND.STUDIO) return { ok: true, command, file };
  if (command === CLI_COMMAND.LAYOUT) return { ok: true, command, file, out: out ?? file, noClobber, rearrange };
  if (command === CLI_COMMAND.RENDER) return { ok: true, command, file, out, noClobber };
  if (command === CLI_COMMAND.VIEW) return { ok: true, command, file, out, noClobber };
  if (!format) return usage("export requires --format.");
  return { ok: true, command, file, format, out, noClobber };
}
