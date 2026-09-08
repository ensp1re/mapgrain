import { createRequire } from "node:module";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LAYOUT_STATUS, runLayout, type ElkEngine } from "@mapgrain/layout/run";
import {
  DARK_TOKENS,
  EXPORT_FORMAT,
  colorNear,
  exportDiagram,
  parseHexRgb,
  pixelAt,
  rasterizeSvg,
} from "@mapgrain/renderer";
import { DOCTOR_CHECK, EXIT_CODE } from "./constants/cli.ts";
import { DOCTOR_DOCUMENT } from "./constants/doctor.ts";
import { exampleFile, packageManifest, schemaFile, studioDir, studioFixtureDir } from "./paths.ts";
import { uniqueSiblingTemp } from "./read.ts";
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
    const markup = new TextDecoder().decode(svg.bytes);
    if (markup.includes("var(--")) {
      return { id: DOCTOR_CHECK.RENDERER, ok: false, message: "SVG still uses CSS variables" };
    }
    if (!markup.includes(">A</text>") || !markup.includes("data-kind=\"node\"")) {
      return { id: DOCTOR_CHECK.RENDERER, ok: false, message: "SVG is missing node labels" };
    }
    const png = exportDiagram({ document: DOCTOR_DOCUMENT, format: EXPORT_FORMAT.PNG });
    if (!png.ok) return { id: DOCTOR_CHECK.RENDERER, ok: false, message: png.errors[0]?.message ?? "png failed" };
    const raster = rasterizeSvg(markup, 1, DARK_TOKENS.background);
    const corner = pixelAt(raster.pixels, raster.width, 2, 2);
    const background = parseHexRgb(DARK_TOKENS.background);
    if (!colorNear([corner[0], corner[1], corner[2]], background)) {
      return {
        id: DOCTOR_CHECK.RENDERER,
        ok: false,
        message: `PNG background ${corner.slice(0, 3).join(",")} does not match ${DARK_TOKENS.background}`,
      };
    }
    let painted = false;
    const surface = parseHexRgb(DARK_TOKENS.surface);
    const text = parseHexRgb(DARK_TOKENS.text);
    for (let i = 0; i < raster.pixels.length; i += 16) {
      const sample: [number, number, number] = [
        raster.pixels[i] ?? 0,
        raster.pixels[i + 1] ?? 0,
        raster.pixels[i + 2] ?? 0,
      ];
      if (colorNear(sample, surface, 18) || colorNear(sample, text, 18)) {
        painted = true;
        break;
      }
    }
    if (!painted) {
      return { id: DOCTOR_CHECK.RENDERER, ok: false, message: "PNG has no node surface or label paint" };
    }
    return { id: DOCTOR_CHECK.RENDERER, ok: true, message: "SVG and PNG show labeled nodes with theme paints" };
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
  const tmp = uniqueSiblingTemp(dest);
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
