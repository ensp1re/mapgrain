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
  assert.equal(view.svg, new TextDecoder().decode(exported.bytes));
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
  assert.match(view.html, /Download JSON/);
  assert.match(view.html, /static graph, not a live system/);
});

test("viewer payload omits evidence and includes authored edges", async () => {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as { evidence?: unknown };
  raw.evidence = [{ id: "ev1", targetKind: "node", targetId: "gateway", state: "inferred", note: "secret" }];
  const view = renderView(raw);
  assert.equal(view.ok, true);
  if (!view.ok) return;
  assert.doesNotMatch(view.html, /secret/);
  assert.match(view.html, /"source":"gateway"/);
});

test("the viewer package does not depend on the editor", async () => {
  const manifest = JSON.parse(await readFile(pkg, "utf8")) as { dependencies: Record<string, string> };
  assert.equal(Object.hasOwn(manifest.dependencies, "@mapgrain/editor"), false);
  assert.equal(Object.hasOwn(manifest.dependencies, "react"), false);
  assert.equal(Object.hasOwn(manifest.dependencies, "@xyflow/react"), false);
});
