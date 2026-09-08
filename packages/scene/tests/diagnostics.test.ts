import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import { GEOMETRY_DIAGNOSTIC, buildScene, diagnoseGeometry } from "../src/index.ts";

test("nested groups do not report overlap on the original fixture", async () => {
  const raw = JSON.parse(
    await readFile(fileURLToPath(new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url)), "utf8"),
  ) as unknown;
  const loaded = validateDocument(raw);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const scene = buildScene(loaded.document);
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  const issues = diagnoseGeometry(scene.scene);
  assert.equal(
    issues.filter((issue) => issue.code === GEOMETRY_DIAGNOSTIC.OVERLAP).length,
    0,
  );
});

test("overlapping node rects are reported as warnings", async () => {
  const raw = JSON.parse(
    await readFile(fileURLToPath(new URL("../../../tests/fixtures/documents/disconnected.json", import.meta.url)), "utf8"),
  ) as unknown;
  const loaded = validateDocument(raw);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const scene = buildScene(loaded.document, {
    positions: { billing: { x: 0, y: 0 }, notify: { x: 4, y: 4 } },
  });
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  const issues = diagnoseGeometry(scene.scene);
  assert.ok(issues.some((issue) => issue.code === GEOMETRY_DIAGNOSTIC.OVERLAP));
  assert.ok(issues.every((issue) => issue.severity === "warning"));
});
