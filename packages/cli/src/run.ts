import { readFile } from "node:fs/promises";
import { validateDocument } from "@mapgrain/document";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";
import { renderView } from "@mapgrain/viewer";
import { CLI_COMMAND, EXIT_CODE, HELP_TEXT } from "./constants/cli.ts";
import { runDoctor } from "./doctor.ts";
import { parseArgs } from "./parse.ts";
import { packageManifest } from "./paths.ts";
import { fail, readInput, writeBytes } from "./read.ts";
import { runStudio } from "./studio.ts";
import type { CliIo } from "./types/cli.ts";

async function packageVersion(): Promise<string> {
  const raw = JSON.parse(await readFile(packageManifest(), "utf8")) as { version?: string };
  return raw.version ?? "0.0.0";
}

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) return fail(io, parsed.errors, EXIT_CODE.USAGE);

  if (parsed.command === CLI_COMMAND.HELP) {
    io.stdout.write(HELP_TEXT);
    return EXIT_CODE.OK;
  }
  if (parsed.command === CLI_COMMAND.VERSION) {
    io.stdout.write(`${await packageVersion()}\n`);
    return EXIT_CODE.OK;
  }
  if (parsed.command === CLI_COMMAND.DOCTOR) return runDoctor(io);
  if (parsed.command === CLI_COMMAND.STUDIO) return runStudio(parsed.file, io);

  const raw = await readInput(parsed.file, io);
  if (!raw.ok) return raw.exit;

  if (parsed.command === CLI_COMMAND.VALIDATE) {
    const result = validateDocument(raw.value);
    if (!result.ok) return fail(io, result.errors, EXIT_CODE.ERROR);
    io.stdout.write(
      `${JSON.stringify({
        ok: true,
        id: result.document.id,
        revision: result.document.revision,
        nodes: result.document.nodes.length,
      })}\n`,
    );
    return EXIT_CODE.OK;
  }

  if (parsed.command === CLI_COMMAND.VIEW) {
    const view = renderView(raw.value);
    if (!view.ok) {
      return fail(
        io,
        view.errors.map((error) => ({
          code: error.code,
          message: error.message,
          path: error.path,
          elementId: null,
        })),
        EXIT_CODE.ERROR,
      );
    }
    const written = await writeBytes(io, parsed.out, new TextEncoder().encode(view.html), parsed.noClobber);
    return written.ok ? EXIT_CODE.OK : written.exit;
  }

  const format = parsed.command === CLI_COMMAND.RENDER ? EXPORT_FORMAT.SVG : parsed.format;
  const exported = exportDiagram({ document: raw.value, format });
  if (!exported.ok) {
    return fail(
      io,
      exported.errors.map((error) => ({
        code: error.code,
        message: error.message,
        path: error.path,
        elementId: null,
      })),
      EXIT_CODE.ERROR,
    );
  }
  const written = await writeBytes(io, parsed.out, exported.bytes, parsed.noClobber);
  return written.ok ? EXIT_CODE.OK : written.exit;
}