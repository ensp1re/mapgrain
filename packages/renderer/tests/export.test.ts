import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyPortableLayout, validateDocument } from "@mapgrain/document";
import { EXPORT_ERROR_CODE, EXPORT_FORMAT, exportDiagram } from "../src/index.ts";

const fixturesDir = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

async function load(name: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(fixturesDir, name), "utf8")) as unknown;
}

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

test("export JSON and SVG keep committed portable layout", async () => {
  const raw = await load("nested-groups.json");
  const validated = validateDocument(raw);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const moved = applyPortableLayout(validated.document, {
    gateway: { x: -120, y: 40 },
    document: { x: 40, y: 40 },
    layout: { x: 200, y: 40 },
    renderer: { x: 360, y: 40 },
    provider: { x: -120, y: 180 },
  });
  const json = exportDiagram({ document: moved, format: EXPORT_FORMAT.JSON });
  assert.equal(json.ok, true);
  if (!json.ok) return;
  const parsed = JSON.parse(text(json.bytes)) as { layout?: { positions?: Record<string, { x: number }> } };
  assert.equal(parsed.layout?.positions?.gateway?.x, -120);
  const svgMoved = exportDiagram({ document: moved, format: EXPORT_FORMAT.SVG });
  const svgDefault = exportDiagram({ document: validated.document, format: EXPORT_FORMAT.SVG });
  assert.equal(svgMoved.ok && svgDefault.ok, true);
  if (!svgMoved.ok || !svgDefault.ok) return;
  assert.notEqual(text(svgMoved.bytes), text(svgDefault.bytes));
  const reimported = validateDocument(JSON.parse(text(json.bytes)));
  assert.equal(reimported.ok, true);
  if (!reimported.ok) return;
  const svgAgain = exportDiagram({ document: reimported.document, format: EXPORT_FORMAT.SVG });
  assert.equal(svgAgain.ok, true);
  if (!svgAgain.ok) return;
  assert.equal(text(svgAgain.bytes), text(svgMoved.bytes));
});

test("hundred-node fixture exports SVG from the canonical scene", async () => {
  const raw = await load("hundred-nodes.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = text(result.bytes);
  assert.match(svg, /<svg /);
  assert.match(svg, /data-id="core00"/);
  assert.match(svg, /Core service 00/);
  assert.match(svg, /data-kind="node"/);
});

test("JSON export is built from the document and omits evidence by default", async () => {
  const raw = await load("nested-groups.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.JSON });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const parsed = JSON.parse(text(result.bytes)) as { evidence?: unknown; nodes: unknown[] };
  assert.equal(Object.hasOwn(parsed, "evidence"), false);
  assert.ok(parsed.nodes.length > 0);
  assert.equal(result.mediaType, "application/json");
});

test("JSON export can keep evidence when asked", async () => {
  const raw = await load("nested-groups.json");
  const result = exportDiagram({
    document: raw,
    format: EXPORT_FORMAT.JSON,
    includeEvidence: true,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const parsed = JSON.parse(text(result.bytes)) as { evidence?: unknown[] };
  assert.ok(Array.isArray(parsed.evidence));
  assert.ok((parsed.evidence?.length ?? 0) > 0);
});

test("SVG captions and CSS variables match the canonical scene", async () => {
  const raw = await load("parallel-edges.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = text(result.bytes);
  assert.match(svg, /reads · get/);
  assert.match(svg, /writes · set/);
  assert.match(svg, /var\(--mg-bg,/);
  assert.match(svg, /var\(--mg-text,/);
  assert.match(svg, / Q/);
});

test("SVG is drawn from the scene, not a screenshot, and keeps labels", async () => {
  const raw = await load("parallel-edges.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = text(result.bytes);
  assert.match(svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /data-kind="node"/);
  assert.match(svg, /Query API/);
  assert.doesNotMatch(svg, /<foreignObject/);
  assert.doesNotMatch(svg, /https:\/\//);
});

test("HTML is offline: no scripts, remotes, or credentials", async () => {
  const raw = await load("nested-groups.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.HTML });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const html = text(result.bytes);
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<svg /);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /https:\/\//);
  assert.doesNotMatch(html, /api[_-]?key/i);
  assert.doesNotMatch(html, /Runs on the user's machine/);
});

test("selection export omits unselected nodes", async () => {
  const raw = await load("disconnected.json");
  const result = exportDiagram({
    document: raw,
    format: EXPORT_FORMAT.JSON,
    nodeIds: ["search", "index"],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const parsed = JSON.parse(text(result.bytes)) as {
    nodes: Array<{ id: string }>;
    edges: Array<{ id: string }>;
  };
  assert.deepEqual(parsed.nodes.map((node) => node.id).sort(), ["index", "search"]);
  assert.equal(parsed.edges.length, 1);
});

test("PNG is a raster of the SVG and oversized jobs fail with a smaller scale", async () => {
  const raw = await load("cycle.json");
  const png = exportDiagram({ document: raw, format: EXPORT_FORMAT.PNG, scale: 1 });
  assert.equal(png.ok, true);
  if (!png.ok) return;
  assert.equal(png.bytes[0], 0x89);
  assert.equal(png.bytes[1], 0x50);
  assert.equal(png.bytes[2], 0x4e);
  assert.equal(png.bytes[3], 0x47);
  assert.ok((png.width ?? 0) > 0);

  const tooBig = exportDiagram({
    document: raw,
    format: EXPORT_FORMAT.PNG,
    scale: 4,
    maxPixels: 100,
  });
  assert.equal(tooBig.ok, false);
  if (tooBig.ok) return;
  assert.equal(tooBig.errors[0]?.code, EXPORT_ERROR_CODE.EXPORT_TOO_LARGE);
  assert.ok((tooBig.errors[0]?.suggestedScale ?? 1) < 4);
});

test("exports never include selection or comment bags", async () => {
  const raw = await load("workflow-review.json");
  for (const format of [EXPORT_FORMAT.JSON, EXPORT_FORMAT.SVG, EXPORT_FORMAT.HTML] as const) {
    const result = exportDiagram({ document: raw, format });
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    const body = text(result.bytes);
    assert.doesNotMatch(body, /"selection"/);
    assert.doesNotMatch(body, /"comments"/);
    assert.doesNotMatch(body, /"apiKey"/);
  }
});
