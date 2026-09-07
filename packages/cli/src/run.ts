import { validateDocument } from "@mapgrain/document";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";
import { renderView } from "@mapgrain/viewer";
import { CLI_COMMAND, DIAGNOSTIC_CODE, EXIT_CODE } from "./constants/cli.ts";
import { parseArgs } from "./parse.ts";
import type { CliIo, DiagnosticIssue } from "./types/cli.ts";

function writeJson(io: CliIo, stream: "stdout" | "stderr", value: unknown): void {
  io[stream].write(`${JSON.stringify(value)}\n`);
}

function fail(io: CliIo, errors: DiagnosticIssue[], code: number): number {
  writeJson(io, "stderr", { ok: false, errors });
  return code;
}

async function readDocument(
  file: string,
  io: CliIo,
): Promise<{ ok: true; value: unknown } | { ok: false; exit: number }> {
  let text: string;
  try {
    text = await io.readFile(file);
  } catch (error) {
    return {
      ok: false,
      exit: fail(
        io,
        [
          {
            code: DIAGNOSTIC_CODE.IO,
            message: error instanceof Error ? error.message : String(error),
            path: file,
            elementId: null,
          },
        ],
        EXIT_CODE.ERROR,
      ),
    };
  }
  try {
    const value = JSON.parse(text) as unknown;
    if (value === null || typeof value !== "object") {
      return {
        ok: false,
        exit: fail(
          io,
          [
            {
              code: DIAGNOSTIC_CODE.INVALID_DOCUMENT,
              message: "Input must be a JSON object.",
              path: file,
              elementId: null,
            },
          ],
          EXIT_CODE.ERROR,
        ),
      };
    }
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      exit: fail(
        io,
        [
          {
            code: DIAGNOSTIC_CODE.INVALID_DOCUMENT,
            message: error instanceof Error ? error.message : "Invalid JSON.",
            path: file,
            elementId: null,
          },
        ],
        EXIT_CODE.ERROR,
      ),
    };
  }
}

async function writeBytes(io: CliIo, out: string | null, bytes: Uint8Array): Promise<void> {
  if (!out) {
    io.stdout.write(bytes);
    return;
  }
  const tmp = `${out}.tmp`;
  await io.writeFile(tmp, bytes);
  if (io.rename) {
    await io.rename(tmp, out);
    return;
  }
  await io.writeFile(out, bytes);
}

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) return fail(io, parsed.errors, EXIT_CODE.USAGE);

  const raw = await readDocument(parsed.file, io);
  if (!raw.ok) return raw.exit;

  if (parsed.command === CLI_COMMAND.VALIDATE) {
    const result = validateDocument(raw.value);
    if (!result.ok) {
      return fail(io, result.errors, EXIT_CODE.ERROR);
    }
    writeJson(io, "stdout", {
      ok: true,
      id: result.document.id,
      revision: result.document.revision,
      nodes: result.document.nodes.length,
    });
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
    try {
      await writeBytes(io, parsed.out, new TextEncoder().encode(view.html));
    } catch (error) {
      return fail(
        io,
        [
          {
            code: DIAGNOSTIC_CODE.IO,
            message: error instanceof Error ? error.message : String(error),
            path: parsed.out ?? "-",
            elementId: null,
          },
        ],
        EXIT_CODE.ERROR,
      );
    }
    return EXIT_CODE.OK;
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
  try {
    await writeBytes(io, parsed.out, exported.bytes);
  } catch (error) {
    return fail(
      io,
      [
        {
          code: DIAGNOSTIC_CODE.IO,
          message: error instanceof Error ? error.message : String(error),
          path: parsed.out ?? "-",
          elementId: null,
        },
      ],
      EXIT_CODE.ERROR,
    );
  }
  return EXIT_CODE.OK;
}
