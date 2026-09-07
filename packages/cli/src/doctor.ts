import { createRequire } from "node:module";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LAYOUT_STATUS, runLayout, type ElkEngine } from "@mapgrain/layout/run";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";
import { DOCTOR_CHECK, EXIT_CODE } from "./constants/cli.ts";
import { DOCTOR_DOCUMENT } from "./constants/doctor.ts";
import { exampleFile, packageManifest, schemaFile, studioDir, studioFixtureDir } from "./paths.ts";
import type { CliIo, DoctorCheck } from "./types/cli.ts";

function nodeSupported(version: string): boolean {
  const major = Number(version.split(".")[0]);
  return major >= 24 && major < 27;
}

async function checkRuntime(): Promise<DoctorCheck> {
  const version = process.versions.node;
  const ok = nodeSupported(version);
  return {
    id: DOCTOR_CHECK.RUNTIME,
    ok,
    message: ok ? `Node.js ${version}` : `Node.js ${version} is unsupported; need >=24 <27`,
  };
}

async function checkAssets(): Promise<DoctorCheck> {
  try {
    const schema = await readFile(schemaFile(), "utf8");
    JSON.parse(schema);
    await readFile(exampleFile(), "utf8");
    await readFile(packageManifest(), "utf8");
    try {
      await readFile(join(studioDir(), "index.html"), "utf8");
    } catch {
      await readFile(join(studioFixtureDir(), "index.html"), "utf8");
    }
    return { id: DOCTOR_CHECK.ASSETS, ok: true, message: "schema, example, and studio assets present" };
  } catch (error) {
    return {
      id: DOCTOR_CHECK.ASSETS,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkWorker(): Promise<DoctorCheck> {
  try {
    const require = createRequire(import.meta.url);
    const ELK = require("elkjs/lib/elk.bundled.js") as new () => ElkEngine;
    const result = await runLayout(1, 0, DOCTOR_DOCUMENT, {}, new ELK());
    if (result.status !== LAYOUT_STATUS.LAID_OUT) {
      return { id: DOCTOR_CHECK.WORKER, ok: false, message: `layout status ${result.status}` };
    }
    return { id: DOCTOR_CHECK.WORKER, ok: true, message: "ELK layout produced positions" };
  } catch (error) {
    return {
      id: DOCTOR_CHECK.WORKER,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkRenderer(): Promise<DoctorCheck> {
  try {
    const svg = exportDiagram({ document: DOCTOR_DOCUMENT, format: EXPORT_FORMAT.SVG });
    if (!svg.ok) return { id: DOCTOR_CHECK.RENDERER, ok: false, message: svg.errors[0]?.message ?? "svg failed" };
    const png = exportDiagram({ document: DOCTOR_DOCUMENT, format: EXPORT_FORMAT.PNG });
    if (!png.ok) return { id: DOCTOR_CHECK.RENDERER, ok: false, message: png.errors[0]?.message ?? "png failed" };
    return { id: DOCTOR_CHECK.RENDERER, ok: true, message: "SVG and PNG export succeeded" };
  } catch (error) {
    return {
      id: DOCTOR_CHECK.RENDERER,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkOutput(): Promise<DoctorCheck> {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-doctor-"));
  const dest = join(dir, "ok.txt");
  const tmp = `${dest}.tmp`;
  try {
    await writeFile(tmp, "ok");
    await rename(tmp, dest);
    await readFile(dest, "utf8");
    return { id: DOCTOR_CHECK.OUTPUT, ok: true, message: `wrote ${dest}` };
  } catch (error) {
    return {
      id: DOCTOR_CHECK.OUTPUT,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function runDoctor(io: CliIo): Promise<number> {
  const checks = [
    await checkRuntime(),
    await checkAssets(),
    await checkWorker(),
    await checkRenderer(),
    await checkOutput(),
  ];
  const ok = checks.every((check) => check.ok);
  io.stdout.write(`${JSON.stringify({ ok, checks })}\n`);
  return ok ? EXIT_CODE.OK : EXIT_CODE.ERROR;
}
