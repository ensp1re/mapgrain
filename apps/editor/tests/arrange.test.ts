import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import { LAYOUT_STATUS, createLayoutEngine } from "@mapgrain/layout";
import { buildScene } from "@mapgrain/scene";
import { mergePositions, pinsFromDocument } from "../src/layout/pins.ts";
import { positionsFromScene } from "../src/geometry/positions.ts";

const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

async function load(name: string) {
  const raw = JSON.parse(await readFile(`${fixtures}/${name}`, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("invalid fixture");
  return result.document;
}

test("pins from the document keep current coordinates", async () => {
  const document = await load("nested-groups.json");
  const scene = buildScene(document);
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  const positions = positionsFromScene(scene.scene.nodes);
  const pins = pinsFromDocument(document, positions);
  assert.ok(pins.gateway);
  assert.equal(pins.gateway?.x, positions.gateway?.x);
  assert.equal(pins.gateway?.y, positions.gateway?.y);
});

test("successful arrange keeps pinned node coordinates", async () => {
  const engine = createLayoutEngine();
  try {
    const document = await load("disconnected.json");
    const unconstrained = await engine.layout({ document });
    assert.equal(unconstrained.status, LAYOUT_STATUS.LAID_OUT);
    if (unconstrained.status !== LAYOUT_STATUS.LAID_OUT) return;
    const billing = unconstrained.positions.billing;
    assert.ok(billing);
    const pin = { x: billing.x + 400, y: billing.y };
    const result = await engine.layout({ document, pins: { billing: pin } });
    assert.equal(result.status, LAYOUT_STATUS.LAID_OUT);
    if (result.status !== LAYOUT_STATUS.LAID_OUT) return;
    assert.equal(result.positions.billing?.x, pin.x);
    assert.equal(result.positions.billing?.y, pin.y);
    const merged = mergePositions(unconstrained.positions, result.positions);
    assert.equal(merged.billing?.x, pin.x);
  } finally {
    await engine.dispose();
  }
});

test("overlapping pins yield a visible conflict and are not applied", async () => {
  const engine = createLayoutEngine();
  try {
    const document = await load("disconnected.json");
    const unconstrained = await engine.layout({ document });
    assert.equal(unconstrained.status, LAYOUT_STATUS.LAID_OUT);
    if (unconstrained.status !== LAYOUT_STATUS.LAID_OUT) return;
    const origin = unconstrained.positions.billing;
    assert.ok(origin);
    const result = await engine.layout({
      document,
      pins: {
        billing: origin,
        notify: { x: origin.x + 4, y: origin.y + 4 },
      },
    });
    assert.equal(result.status, LAYOUT_STATUS.CONFLICT);
    if (result.status !== LAYOUT_STATUS.CONFLICT) return;
    assert.ok(result.conflict.overlappingNodeIds.length > 0);
    assert.deepEqual(result.conflict.pins.billing, origin);
  } finally {
    await engine.dispose();
  }
});
