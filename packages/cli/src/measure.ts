import { arch, cpus, platform } from "node:os";
import { LAYOUT_STATUS, createLayoutEngine } from "@mapgrain/layout";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";
import { buildScene } from "@mapgrain/scene";

export interface TimingSample {
  sceneMs: number;
  layoutMs: number;
  svgMs: number;
}

export interface FixtureMeasure {
  name: string;
  cold: TimingSample;
  warm: {
    reps: number;
    p50: TimingSample;
    p95: TimingSample;
  };
}

export interface PerfReport {
  measuredAt: string;
  runtime: {
    node: string;
    platform: string;
    arch: string;
    device: string;
  };
  browser: null;
  fixtures: FixtureMeasure[];
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

async function timeOnce(document: unknown): Promise<TimingSample> {
  const sceneStarted = performance.now();
  const scene = buildScene(document);
  const sceneMs = performance.now() - sceneStarted;
  if (!scene.ok) throw new Error("scene failed");
  const engine = createLayoutEngine();
  try {
    const layoutStarted = performance.now();
    const laid = await engine.layout({ document });
    const layoutMs = performance.now() - layoutStarted;
    if (laid.status !== LAYOUT_STATUS.LAID_OUT) throw new Error(`layout ${laid.status}`);
    const svgStarted = performance.now();
    const svg = exportDiagram({ document, format: EXPORT_FORMAT.SVG });
    const svgMs = performance.now() - svgStarted;
    if (!svg.ok) throw new Error("svg failed");
    return { sceneMs, layoutMs, svgMs };
  } finally {
    await engine.dispose();
  }
}

function roundMs(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundSample(sample: TimingSample): TimingSample {
  return {
    sceneMs: roundMs(sample.sceneMs),
    layoutMs: roundMs(sample.layoutMs),
    svgMs: roundMs(sample.svgMs),
  };
}

function band(samples: TimingSample[], p: number): TimingSample {
  return roundSample({
    sceneMs: percentile(
      samples.map((item) => item.sceneMs),
      p,
    ),
    layoutMs: percentile(
      samples.map((item) => item.layoutMs),
      p,
    ),
    svgMs: percentile(
      samples.map((item) => item.svgMs),
      p,
    ),
  });
}

export async function measureFixture(name: string, document: unknown, warmReps = 5): Promise<FixtureMeasure> {
  const cold = await timeOnce(document);
  const warmSamples: TimingSample[] = [];
  for (let i = 0; i < warmReps; i += 1) {
    warmSamples.push(await timeOnce(document));
  }
  return {
    name,
    cold: roundSample(cold),
    warm: {
      reps: warmReps,
      p50: band(warmSamples, 50),
      p95: band(warmSamples, 95),
    },
  };
}

export async function measureDocuments(
  fixtures: Array<{ name: string; document: unknown }>,
): Promise<PerfReport> {
  const fixturesMeasured: FixtureMeasure[] = [];
  for (const fixture of fixtures) {
    fixturesMeasured.push(await measureFixture(fixture.name, fixture.document));
  }
  return {
    measuredAt: new Date().toISOString(),
    runtime: {
      node: process.versions.node,
      platform: platform(),
      arch: arch(),
      device: cpus()[0]?.model ?? "unknown",
    },
    browser: null,
    fixtures: fixturesMeasured,
  };
}
