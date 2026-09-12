import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyPortableLayout, validateDocument } from "@mapgrain/document";
import {
  COLOR_MODE,
  DARK_TOKENS,
  LIGHT_TOKENS,
  EXPORT_ERROR_CODE,
  EXPORT_FORMAT,
  colorNear,
  exportDiagram,
  parseHexRgb,
  pixelAt,
  rasterHasPaint,
  rasterizeSvg,
} from "../src/index.ts";

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
  assert.match(svg, />get</);
  assert.match(svg, />set</);
  // The edge type is carried by the line, not repeated in every caption.
  assert.doesNotMatch(svg, /reads · get/);
  const body = svg.replace(/<style><!\[CDATA\[[\s\S]*?\]\]><\/style>/, "");
  assert.match(body, new RegExp(`class="mg-bg"[^>]*fill="${LIGHT_TOKENS.background}"`));
  assert.match(body, new RegExp(`fill="${LIGHT_TOKENS.text}"`));
  assert.doesNotMatch(body, /var\(--/);
  assert.match(svg, / Q/);
  assert.doesNotMatch(body, /<g data-kind="edge"[^>]*stroke="/);
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

test("PNG raster uses resolved theme paints, not CSS variables", async () => {
  const raw = await load("cycle.json");
  const dark = exportDiagram({ document: raw, format: EXPORT_FORMAT.PNG, scale: 1, theme: "dark" });
  const light = exportDiagram({ document: raw, format: EXPORT_FORMAT.PNG, scale: 1, theme: "light" });
  assert.equal(dark.ok && light.ok, true);
  if (!dark.ok || !light.ok) return;
  assert.notEqual(Buffer.from(dark.bytes).toString("hex"), Buffer.from(light.bytes).toString("hex"));
  const svg = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG, theme: "dark" });
  assert.equal(svg.ok, true);
  if (!svg.ok) return;
  const markup = text(svg.bytes);
  const raster = rasterizeSvg(markup, 1, DARK_TOKENS.background);
  const corner = pixelAt(raster.pixels, raster.width, 1, 1);
  assert.equal(
    colorNear([corner[0], corner[1], corner[2]], parseHexRgb(DARK_TOKENS.background)),
    true,
    `corner ${corner.slice(0, 3).join(",")}`,
  );
  const surface = parseHexRgb(DARK_TOKENS.surface);
  const label = parseHexRgb(DARK_TOKENS.text);
  assert.equal(rasterHasPaint(raster.pixels, surface, 24), true, "PNG missing node surface paint");
  assert.equal(rasterHasPaint(raster.pixels, label, 24), true, "PNG missing node label paint");
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

test("long labels, Cyrillic, and CJK survive SVG even when glyphs are missing from Inter latin", async () => {
  const raw = await load("long-labels.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = text(result.bytes);
  assert.match(svg, /Регіональний/);
  assert.match(svg, /Працівник/);
  assert.match(svg, /font-family="Inter"/);
  const png = exportDiagram({ document: raw, format: EXPORT_FORMAT.PNG, scale: 1 });
  assert.equal(png.ok, true);
});

test("themed SVG keeps CSS variables for the viewer palette", async () => {
  const raw = await load("parallel-edges.json");
  const result = exportDiagram({
    document: raw,
    format: EXPORT_FORMAT.SVG,
    colorMode: COLOR_MODE.THEMED,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(text(result.bytes), /var\(--mg-bg,/);
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

test("share-card export is a PNG of a named view", async () => {
  const raw = await load("sequence-checkout.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.CARD, viewId: "happy-path" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.format, EXPORT_FORMAT.PNG);
  assert.ok(result.bytes.length > 100);
});

test("data-flow SVG draws process pills and store cylinders", async () => {
  const raw = await load("data-flow-ingest.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = new TextDecoder().decode(result.bytes);
  assert.match(svg, /data-id="capture"[^>]*data-shape="process"/);
  assert.match(svg, /data-id="records"[^>]*data-shape="store"/);
  assert.match(svg, /data-id="user"[^>]*data-shape="entity"/);
  assert.match(svg, /<ellipse /);
});

test("architecture SVG omits data-flow shapes", async () => {
  const raw = await load("nested-groups.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = new TextDecoder().decode(result.bytes);
  assert.doesNotMatch(svg, /data-shape=/);
});

test("workflow SVG draws equal-width lanes from groups", async () => {
  const raw = await load("workflow-decision.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = new TextDecoder().decode(result.bytes);
  assert.match(svg, /data-kind="lane"/);
  assert.match(svg, /data-id="author-lane"/);
  assert.match(svg, /data-id="review-lane"/);
  const widths = [...svg.matchAll(/data-kind="lane"[\s\S]*?<rect[^>]*width="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(widths.length, 2);
  assert.equal(widths[0], widths[1]);
  // The lane body stays unfilled so a connection crossing it is not painted over; only the
  // header band is tinted.
  assert.match(svg, /data-kind="lane"[^>]*>\s*<path d="M[^"]+" fill="#/);
  assert.match(svg, /data-kind="lane"[^>]*>\s*<path[^>]*>\s*<rect[^>]*fill="none"/);
});

test("architecture SVG keeps nested groups and omits lanes", async () => {
  const raw = await load("nested-groups.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = new TextDecoder().decode(result.bytes);
  assert.match(svg, /data-kind="group"/);
  assert.doesNotMatch(svg, /data-kind="lane"/);
});

test("architecture SVG tints kinds and draws a legend", async () => {
  const raw = await load("nested-groups.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = new TextDecoder().decode(result.bytes);
  assert.match(svg, /data-kind-fill="gateway"/);
  assert.match(svg, /data-kind-fill="external"/);
  assert.match(svg, /data-kind="legend"/);
  assert.match(svg, /data-legend-kind="gateway"/);
});

test("lifecycle SVG omits the architecture kind legend", async () => {
  const raw = await load("lifecycle-session.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = new TextDecoder().decode(result.bytes);
  assert.doesNotMatch(svg, /data-kind="legend"/);
  assert.doesNotMatch(svg, /data-kind-fill=/);
});

test("lifecycle SVG draws initial disk and arrow, final ring, and omits STATE chips", async () => {
  const raw = await load("lifecycle-session.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = new TextDecoder().decode(result.bytes);
  assert.match(svg, /data-marker="initial"/);
  assert.match(svg, /data-marker="final"/);
  assert.match(svg, /data-state-tone="start"/);
  assert.match(svg, /data-state-tone="active"/);
  assert.match(svg, /data-state-tone="done"/);
  assert.match(svg, /<polygon /);
  assert.doesNotMatch(svg, />STATE</);
});

test("sequence SVG draws alt and opt fragments", async () => {
  const raw = await load("sequence-checkout.json");
  const result = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const svg = new TextDecoder().decode(result.bytes);
  assert.match(svg, /data-kind="fragment"/);
  assert.match(svg, /data-fragment-kind="alt"/);
  assert.match(svg, /data-fragment-kind="opt"/);
});

test("sequence, data-flow, lifecycle, and decision fixtures export JSON, SVG, PNG, and HTML", async () => {
  const cases = [
    { name: "sequence-checkout.json", needle: /Checkout API[\s\S]*submit|submit[\s\S]*Checkout API/ },
    { name: "data-flow-ingest.json", needle: /Analyst/ },
    { name: "lifecycle-session.json", needle: /Idle/ },
    { name: "workflow-decision.json", needle: /Approve\?/ },
  ] as const;
  for (const fixture of cases) {
    const raw = await load(fixture.name);
    for (const format of [
      EXPORT_FORMAT.JSON,
      EXPORT_FORMAT.SVG,
      EXPORT_FORMAT.PNG,
      EXPORT_FORMAT.HTML,
    ] as const) {
      const result = exportDiagram({ document: raw, format });
      assert.equal(
        result.ok,
        true,
        `${fixture.name} ${format} ${result.ok ? "" : JSON.stringify(result.errors)}`,
      );
      if (!result.ok) continue;
      if (format === EXPORT_FORMAT.PNG) {
        assert.ok(result.bytes.length > 100);
        continue;
      }
      const body = text(result.bytes);
      if (format === EXPORT_FORMAT.JSON) {
        const parsed = JSON.parse(body) as { kind?: string; title?: string };
        assert.ok(parsed.kind);
        assert.ok(parsed.title);
      }
      if (format === EXPORT_FORMAT.SVG) {
        assert.match(body, /<svg/);
        assert.match(body, fixture.needle);
      }
      if (format === EXPORT_FORMAT.HTML) {
        assert.match(body, /<svg/);
        assert.match(body, fixture.needle);
      }
    }
  }
});
