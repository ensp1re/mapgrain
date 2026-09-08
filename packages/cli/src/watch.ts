import { validateDocument, type DiagramDocument } from "@mapgrain/document";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";
import { renderView } from "@mapgrain/viewer";
import { EXIT_CODE } from "./constants/cli.ts";
import type { CliIo } from "./types/cli.ts";

export interface WatchState {
  lastGood: DiagramDocument | null;
  lastRaw: string | null;
}

export function applyWatchTick(
  raw: string,
  previous: WatchState,
): { state: WatchState; ok: boolean; message: string } {
  const parsed = (() => {
    try {
      return { ok: true as const, value: JSON.parse(raw) as unknown };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : String(error) };
    }
  })();
  if (!parsed.ok) {
    return {
      state: previous,
      ok: false,
      message: `invalid json; keeping last good (${previous.lastGood?.id ?? "none"}): ${parsed.message}`,
    };
  }
  const validated = validateDocument(parsed.value);
  if (!validated.ok) {
    const first = validated.errors[0]?.message ?? "invalid document";
    return {
      state: previous,
      ok: false,
      message: `invalid document; keeping last good (${previous.lastGood?.id ?? "none"}): ${first}`,
    };
  }
  return {
    state: { lastGood: validated.document, lastRaw: raw },
    ok: true,
    message: `reloaded ${validated.document.id} revision ${validated.document.revision}`,
  };
}

export async function writeWatchArtifact(
  document: DiagramDocument,
  format: "json" | "html" | "svg" | "png",
  io: CliIo,
  out: string | null,
): Promise<number> {
  if (format === "html") {
    const view = renderView(document);
    if (!view.ok) return EXIT_CODE.ERROR;
    if (!out) {
      io.stdout.write(view.html);
      return EXIT_CODE.OK;
    }
    await io.writeFile(out, new TextEncoder().encode(view.html));
    return EXIT_CODE.OK;
  }
  const exported = exportDiagram({
    document,
    format: format === "json" ? EXPORT_FORMAT.JSON : format === "svg" ? EXPORT_FORMAT.SVG : EXPORT_FORMAT.PNG,
  });
  if (!exported.ok) return EXIT_CODE.ERROR;
  if (!out) {
    io.stdout.write(exported.bytes);
    return EXIT_CODE.OK;
  }
  await io.writeFile(out, exported.bytes);
  return EXIT_CODE.OK;
}
