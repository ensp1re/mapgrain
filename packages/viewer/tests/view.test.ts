import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";
import { renderView } from "../src/index.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);
const pkg = fileURLToPath(new URL("../package.json", import.meta.url));

test("viewer HTML contains the same node labels as the SVG export", async () => {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const view = renderView(raw);
  assert.equal(view.ok, true);
  if (!view.ok) return;
  const exported = exportDiagram({ document: raw, format: EXPORT_FORMAT.SVG });
  assert.equal(exported.ok, true);
  if (!exported.ok) return;
  const exportedSvg = new TextDecoder().decode(exported.bytes);
  assert.match(view.svg, /Workspace API/);
  assert.match(exportedSvg, /Workspace API/);
  assert.match(view.svg, /var\(--mg-bg,/);
  assert.doesNotMatch(exportedSvg, /var\(--/);
  assert.match(view.html, /Workspace API/);
  assert.match(view.html, /<svg /);
});

test("the view has no edit controls, chat, or inspector", async () => {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const view = renderView(raw);
  assert.equal(view.ok, true);
  if (!view.ok) return;
  assert.match(view.html, /data-mode="readonly"/);
  assert.match(view.html, /Read-only view/);
  assert.doesNotMatch(view.html, /Inspector/);
  assert.doesNotMatch(view.html, /Chat/);
  assert.doesNotMatch(view.html, /https:\/\//);
  assert.doesNotMatch(view.html, /contenteditable/i);
  assert.match(view.html, /data-act="fit"/);
  assert.match(view.html, /aria-label="Search"/);
  assert.match(view.html, /data-act="theme"/);
  assert.match(view.html, /data-act="reach-up"/);
  assert.match(view.html, /data-act="reach-down"/);
  assert.match(view.html, /data-act="route"/);
  assert.match(view.html, /data-act="view"/);
  assert.match(view.html, /data-act="reset"/);
  assert.match(view.html, /Download JSON/);
  assert.match(view.html, /static graph, not a live system/);
  assert.match(view.html, /Math\.min\(availW \/ size\.w, availH \/ size\.h\)/);
  assert.match(view.html, /hashchange/);
  assert.match(view.html, /history\.replaceState/);
  assert.match(view.html, /--mg-bg:/);
  assert.match(view.html, /html\[data-theme="light"\]/);
  assert.match(view.html, /dataset\.theme === "light" \? "dark" : "light"/);
});

test("viewer payload omits evidence and includes authored edges", async () => {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as { evidence?: unknown };
  raw.evidence = [{ id: "ev1", targetKind: "node", targetId: "gateway", state: "inferred", note: "secret" }];
  const view = renderView(raw);
  assert.equal(view.ok, true);
  if (!view.ok) return;
  assert.doesNotMatch(view.html, /secret/);
  assert.match(view.html, /"source":"gateway"/);
  assert.match(view.html, /"direction":"forward"/);
  assert.match(view.html, /"id":"request-path"/);
  assert.match(view.html, /"from":"gateway"/);
  assert.match(view.html, /"to":"renderer"/);
});

test("viewer navigation uses indexes and bounding boxes and does not mutate source", async () => {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const view = renderView(raw);
  assert.equal(view.ok, true);
  if (!view.ok) return;
  assert.match(view.html, /function buildIndex\(edges\)/);
  assert.match(view.html, /index\.down/);
  assert.match(view.html, /index\.up/);
  assert.match(view.html, /node\.getBBox\(\)/);
  assert.match(view.html, /Object\.freeze\(payload\)/);
  assert.match(view.html, /e\.key === "Enter" \|\| e\.key === " "/);
  assert.match(view.html, /e\.key === "\/"/);
  assert.doesNotMatch(view.html, /scrollIntoView/);
  assert.doesNotMatch(view.html, /payload\.edges\.find/);
  assert.doesNotMatch(view.html, /payload\.document\s*=/);
  assert.doesNotMatch(view.html, /https:\/\//);
  assert.doesNotMatch(view.html, /googleapis|cdnjs|unpkg|jsdelivr/i);
});

test("the 100-node fixture exports a read-only viewer with direction in the payload", async () => {
  const hundred = fileURLToPath(new URL("../../../tests/fixtures/documents/hundred-nodes.json", import.meta.url));
  const raw = JSON.parse(await readFile(hundred, "utf8")) as unknown;
  const view = renderView(raw);
  assert.equal(view.ok, true);
  if (!view.ok) return;
  assert.match(view.html, /data-mode="readonly"/);
  assert.match(view.html, /"direction":"forward"/);
  assert.match(view.html, /data-act="reach-up"/);
});

test("the viewer builds HTML from the vector renderer, not Node PNG", async () => {
  const source = await readFile(fileURLToPath(new URL("../src/view.ts", import.meta.url)), "utf8");
  assert.match(source, /@mapgrain\/renderer\/vector/);
  assert.doesNotMatch(source, /exportDiagram/);
});

test("the viewer package does not depend on the editor", async () => {
  const manifest = JSON.parse(await readFile(pkg, "utf8")) as { dependencies: Record<string, string> };
  assert.equal(Object.hasOwn(manifest.dependencies, "@mapgrain/editor"), false);
  assert.equal(Object.hasOwn(manifest.dependencies, "react"), false);
  assert.equal(Object.hasOwn(manifest.dependencies, "@xyflow/react"), false);
});
