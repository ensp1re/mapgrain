import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { OPERATION_KIND, applyOperation, applyPortableLayout, portablePositions, validateDocument } from "../src/index.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

async function load() {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("invalid fixture");
  return result.document;
}

test("documents without layout still validate", async () => {
  const document = await load();
  assert.equal(document.layout, undefined);
  assert.deepEqual(portablePositions(document), {});
});

test("portable layout stores negative coordinates and drops unknown ids", async () => {
  const document = await load();
  const next = applyPortableLayout(document, {
    gateway: { x: -40, y: 12 },
    document: { x: 80, y: 12 },
    missing: { x: 1, y: 1 },
  });
  assert.equal(next.layout?.version, 1);
  assert.equal(next.layout?.positions.gateway?.x, -40);
  assert.equal(next.layout?.positions.missing, undefined);
  const undone = applyOperation(next, {
    kind: OPERATION_KIND.SET_LAYOUT,
    positions: portablePositions(document),
  });
  assert.equal(undone.ok, true);
});

test("set_layout inverse restores previous positions", async () => {
  const document = await load();
  const moved = applyOperation(document, {
    kind: OPERATION_KIND.SET_LAYOUT,
    positions: { gateway: { x: 200, y: 40 } },
  });
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  assert.equal(moved.document.layout?.positions.gateway?.x, 200);
  const undone = applyOperation(moved.document, moved.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.document.layout?.positions.gateway, undefined);
});
