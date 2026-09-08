import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { compareDocuments, snapshotMatches, validateDocument } from "@mapgrain/document";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";
import { buildScene, diagnoseGeometry } from "@mapgrain/scene";
import { localeFrom, renderView } from "@mapgrain/viewer";
import { CLI_COMMAND, EXIT_CODE, HELP_TEXT } from "./constants/cli.ts";
import { runDoctor } from "./doctor.ts";
import { ensureLaidOut } from "./layout.ts";
import { parseArgs } from "./parse.ts";
import { packageManifest } from "./paths.ts";
import { fail, readInput, writeBytes } from "./read.ts";
import { runStudio } from "./studio.ts";
import { encodeStoryVideo } from "./video.ts";
import { applyWatchTick, writeWatchArtifact } from "./watch.ts";
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
  if (parsed.command === CLI_COMMAND.COMPARE) {
    const left = await readInput(parsed.file, io);
    if (!left.ok) return left.exit;
    const right = await readInput(parsed.other, io);
    if (!right.ok) return right.exit;
    const before = validateDocument(left.value);
    const after = validateDocument(right.value);
    if (!before.ok) return fail(io, before.errors, EXIT_CODE.ERROR);
    if (!after.ok) return fail(io, after.errors, EXIT_CODE.ERROR);
    io.stdout.write(`${JSON.stringify({ ok: true, ...compareDocuments(before.document, after.document) })}\n`);
    return EXIT_CODE.OK;
  }
  if (parsed.command === CLI_COMMAND.WATCH) {
    const input = await readInput(parsed.file, io);
    if (!input.ok) return input.exit;
    const rawText = JSON.stringify(input.value);
    const tick = applyWatchTick(rawText, { lastGood: null, lastRaw: null });
    io.stdout.write(`${JSON.stringify({ ok: tick.ok, message: tick.message })}\n`);
    if (tick.state.lastGood) {
      return writeWatchArtifact(tick.state.lastGood, parsed.format, io, parsed.out);
    }
    return EXIT_CODE.ERROR;
  }

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

  if (parsed.command === CLI_COMMAND.DIAGNOSE) {
    const laid = await ensureLaidOut(raw.value, false);
    if (!laid.ok) return fail(io, laid.errors, EXIT_CODE.ERROR);
    const scene = buildScene(laid.document);
    if (!scene.ok) return fail(io, scene.errors, EXIT_CODE.ERROR);
    const issues = diagnoseGeometry(scene.scene);
    const evidence = [];
    for (const item of laid.document.evidence ?? []) {
      if (!item.path) continue;
      const exists = io.exists ? await io.exists(item.path) : false;
      let digest: string | null = null;
      if (exists) {
        try {
          const bytes = new TextEncoder().encode(await io.readFile(item.path));
          digest = createHash("sha256").update(bytes).digest("hex");
        } catch {
          digest = null;
        }
      }
      evidence.push({
        id: item.id,
        path: item.path,
        exists,
        snapshotMatches: snapshotMatches(item.snapshot, digest),
        verified: false,
      });
    }
    io.stdout.write(`${JSON.stringify({ ok: true, id: laid.document.id, issues, evidence })}\n`);
    return EXIT_CODE.OK;
  }

  const laid = await ensureLaidOut(
    raw.value,
    parsed.command === CLI_COMMAND.LAYOUT ? parsed.rearrange : false,
  );
  if (!laid.ok) return fail(io, laid.errors, EXIT_CODE.ERROR);

  if (parsed.command === CLI_COMMAND.LAYOUT) {
    const bytes = new TextEncoder().encode(`${JSON.stringify(laid.document, null, 2)}\n`);
    const written = await writeBytes(io, parsed.out, bytes, parsed.noClobber);
    return written.ok ? EXIT_CODE.OK : written.exit;
  }

  if (
    parsed.command === CLI_COMMAND.VIEW ||
    (parsed.command === CLI_COMMAND.EXPORT && parsed.format === EXPORT_FORMAT.HTML)
  ) {
    const view = renderView(
      laid.document,
      undefined,
      parsed.command === CLI_COMMAND.VIEW || parsed.command === CLI_COMMAND.EXPORT
        ? localeFrom("lang" in parsed ? parsed.lang : undefined)
        : undefined,
    );
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

  if (parsed.command === CLI_COMMAND.EXPORT && parsed.format === EXPORT_FORMAT.VIDEO) {
    const video = encodeStoryVideo(laid.document);
    if (!video.ok) {
      return fail(
        io,
        [{ code: "export", message: video.message, path: "/stories", elementId: null }],
        EXIT_CODE.ERROR,
      );
    }
    const written = await writeBytes(io, parsed.out, video.bytes, parsed.noClobber);
    return written.ok ? EXIT_CODE.OK : written.exit;
  }

  const format = parsed.command === CLI_COMMAND.RENDER ? EXPORT_FORMAT.SVG : parsed.format;
  const exported = exportDiagram({
    document: laid.document,
    format,
    viewId: parsed.command === CLI_COMMAND.EXPORT ? parsed.viewId : undefined,
  });
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