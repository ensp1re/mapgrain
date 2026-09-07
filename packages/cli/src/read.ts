import { DIAGNOSTIC_CODE, EXIT_CODE, MAX_INPUT_BYTES, STDIN_PATH } from "./constants/cli.ts";
import type { CliIo, DiagnosticIssue } from "./types/cli.ts";

function writeJson(io: CliIo, stream: "stdout" | "stderr", value: unknown): void {
  io[stream].write(`${JSON.stringify(value)}\n`);
}

export function fail(io: CliIo, errors: DiagnosticIssue[], code: number): number {
  writeJson(io, "stderr", { ok: false, errors });
  return code;
}

export function reportWrite(io: CliIo, path: string, bytes: number): void {
  writeJson(io, "stdout", { ok: true, action: "write", path, bytes });
}

export async function readInput(
  file: string,
  io: CliIo,
): Promise<{ ok: true; value: unknown } | { ok: false; exit: number }> {
  let text: string;
  try {
    text = file === STDIN_PATH ? await (io.stdin ? io.stdin() : Promise.reject(new Error("stdin is not available"))) : await io.readFile(file);
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
  if (Buffer.byteLength(text, "utf8") > MAX_INPUT_BYTES) {
    return {
      ok: false,
      exit: fail(
        io,
        [
          {
            code: DIAGNOSTIC_CODE.TOO_LARGE,
            message: `Input exceeds ${MAX_INPUT_BYTES} bytes.`,
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

export async function writeBytes(
  io: CliIo,
  out: string | null,
  bytes: Uint8Array,
  noClobber: boolean,
): Promise<{ ok: true } | { ok: false; exit: number }> {
  if (!out) {
    io.stdout.write(bytes);
    return { ok: true };
  }
  if (noClobber && io.exists && (await io.exists(out))) {
    return {
      ok: false,
      exit: fail(
        io,
        [
          {
            code: DIAGNOSTIC_CODE.NO_CLOBBER,
            message: `Refusing to overwrite ${out}.`,
            path: out,
            elementId: null,
          },
        ],
        EXIT_CODE.ERROR,
      ),
    };
  }
  const tmp = `${out}.tmp`;
  try {
    await io.writeFile(tmp, bytes);
    if (io.rename) await io.rename(tmp, out);
    else await io.writeFile(out, bytes);
  } catch (error) {
    return {
      ok: false,
      exit: fail(
        io,
        [
          {
            code: DIAGNOSTIC_CODE.IO,
            message: error instanceof Error ? error.message : String(error),
            path: out,
            elementId: null,
          },
        ],
        EXIT_CODE.ERROR,
      ),
    };
  }
  reportWrite(io, out, bytes.byteLength);
  return { ok: true };
}
