import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PRESET } from "@mapgrain/document";
import { buildScene, presetOverrides } from "../src/index.ts";

test("sequence messages stack by order and keep participant x order", async () => {
  const raw = JSON.parse(
    await readFile(fileURLToPath(new URL("../../../tests/fixtures/documents/sequence-checkout.json", import.meta.url)), "utf8"),
  ) as unknown;
  const scene = buildScene(raw);
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  const xs = scene.scene.nodes.map((node) => node.rect.x);
  assert.ok(xs[0]! < xs[1]! && xs[1]! < xs[2]!);
  const m1 = scene.scene.edges.find((edge) => edge.id === "m1");
  const m2 = scene.scene.edges.find((edge) => edge.id === "m2");
  const m4 = scene.scene.edges.find((edge) => edge.id === "m4");
  assert.ok(m1 && m2 && m4);
  assert.ok(m1.points[0]!.y < m2.points[0]!.y);
  assert.equal(m4.points[0]!.x, m4.points.at(-1)?.x);
  assert.ok(scene.scene.lifelines.length === 3);
});

test("presentation preset uses a larger font than compact", () => {
  const compact = presetOverrides(PRESET.COMPACT);
  const presentation = presetOverrides(PRESET.PRESENTATION);
  assert.ok((presentation.font?.size ?? 0) > (compact.font?.size ?? 0));
});
