import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { OPERATION_KIND, applyOperationAt, validateDocument } from "@mapgrain/document";
import { renderView } from "@mapgrain/viewer";

const skillDir = fileURLToPath(new URL("../../../skills/mapgrain", import.meta.url));
const example = path.join(skillDir, "examples", "ten-node.json");

test("the packaged skill has a name, install command, and runtime rules", async () => {
  const text = await readFile(path.join(skillDir, "SKILL.md"), "utf8");
  assert.match(text, /^---\nname: mapgrain\n/m);
  assert.match(text, /npx skills add ensp1re\/mapgrain --skill mapgrain/);
  assert.match(text, /--agent cursor/);
  assert.match(text, /--agent copilot-codex/);
  assert.match(text, /Do not invent pixel positions/);
  assert.match(text, /Do not execute the repository/);
  assert.match(text, /view diagram.json -o diagram.html/);
  assert.match(text, /At most three repair attempts/);
  assert.match(text, /If `revision` is not the recorded base, stop/);
  const names = await readdir(path.join(skillDir, "examples"));
  assert.ok(names.includes("ten-node.json"));
});

test("the ten-node example validates, keeps evidence, and exports HTML", async () => {
  const raw = JSON.parse(await readFile(example, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.document.nodes.length, 10);
  assert.equal(result.document.id, "doc-invoice-lane");
  assert.ok(result.document.layout?.positions.capture);
  assert.equal(result.document.evidence?.[0]?.state, "observed");
  const html = renderView(result.document);
  assert.equal(html.ok, true);
  if (!html.ok) return;
  assert.match(html.html, /Invoice capture lane/);
  assert.match(html.html, /Read-only view/);
});

test("a label edit keeps ids and portable layout when the base revision matches", async () => {
  const raw = JSON.parse(await readFile(example, "utf8")) as unknown;
  const loaded = validateDocument(raw);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const before = loaded.document.layout?.positions.capture;
  const edited = applyOperationAt(
    loaded.document,
    { kind: OPERATION_KIND.SET_NODE_LABEL, nodeId: "ocr", label: "OCR worker" },
    loaded.document.revision,
  );
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.equal(edited.document.nodes.find((node) => node.id === "ocr")?.label, "OCR worker");
  assert.equal(edited.document.nodes.length, 10);
  assert.deepEqual(edited.document.layout?.positions.capture, before);
  assert.equal(edited.document.layout?.positions.clerk?.x, loaded.document.layout?.positions.clerk?.x);
});
