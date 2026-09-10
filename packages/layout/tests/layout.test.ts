import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { threadId as mainThreadId } from "node:worker_threads";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { GEOMETRY_DIAGNOSTIC, buildScene, diagnoseGeometry } from "@mapgrain/scene";
import { LAYOUT_CONFLICT_CODE, LAYOUT_STATUS, createLayoutEngine } from "../src/index.ts";

const fixturesDir = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

async function load(name: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(fixturesDir, name), "utf8")) as unknown;
}

test("layout runs off the main thread and places nested, cyclic, and parallel graphs", async () => {
  const engine = createLayoutEngine();
  try {
    for (const name of [
      "nested-groups.json",
      "cycle.json",
      "parallel-edges.json",
      "disconnected.json",
      "workflow-review.json",
      "workflow-decision.json",
      "sequence-checkout.json",
      "data-flow-ingest.json",
      "lifecycle-session.json",
      "hundred-nodes.json",
    ]) {
      const result = await engine.layout({ document: await load(name) });
      assert.equal(result.status, LAYOUT_STATUS.LAID_OUT, name);
      if (result.status === LAYOUT_STATUS.LAID_OUT) {
        assert.notEqual(result.threadId, mainThreadId);
        assert.ok(Object.keys(result.positions).length > 0);
        for (const point of Object.values(result.positions)) {
          assert.equal(Number.isFinite(point.x), true);
          assert.equal(Number.isFinite(point.y), true);
        }
      }
    }
  } finally {
    await engine.dispose();
  }
});

test("laid-out fixtures keep edge labels off nodes", async () => {
  const engine = createLayoutEngine();
  try {
    for (const name of ["nested-groups.json", "data-flow-ingest.json", "cycle.json", "workflow-decision.json"]) {
      const document = await load(name);
      const result = await engine.layout({ document });
      assert.equal(result.status, LAYOUT_STATUS.LAID_OUT, name);
      if (result.status !== LAYOUT_STATUS.LAID_OUT) return;
      const scene = buildScene(document, { positions: result.positions });
      assert.equal(scene.ok, true, name);
      if (!scene.ok) return;
      const issues = diagnoseGeometry(scene.scene).filter(
        (issue) => issue.code === GEOMETRY_DIAGNOSTIC.LABEL_CLEARANCE,
      );
      assert.equal(issues.length, 0, `${name} ${JSON.stringify(issues)}`);
    }
  } finally {
    await engine.dispose();
  }
});

test("workflow lanes stack groups vertically", async () => {
  const engine = createLayoutEngine();
  try {
    const result = await engine.layout({ document: await load("workflow-decision.json") });
    assert.equal(result.status, LAYOUT_STATUS.LAID_OUT);
    if (result.status !== LAYOUT_STATUS.LAID_OUT) return;
    const author = result.positions.author;
    const route = result.positions.route;
    const publish = result.positions.publish;
    const revise = result.positions.revise;
    assert.ok(author && route && publish && revise);
    assert.ok(author.y + 40 < route.y);
    assert.ok(publish.x > route.x);
    assert.ok(Math.abs(publish.x - revise.x) < 16);
  } finally {
    await engine.dispose();
  }
});

test("pinned nodes keep their coordinates when space allows", async () => {
  const engine = createLayoutEngine();
  try {
    const document = await load("disconnected.json");
    const unconstrained = await engine.layout({ document });
    assert.equal(unconstrained.status, LAYOUT_STATUS.LAID_OUT);
    if (unconstrained.status !== LAYOUT_STATUS.LAID_OUT) return;
    const billing = unconstrained.positions.billing;
    assert.ok(billing);
    const pin = { x: billing.x + 400, y: billing.y };
    const result = await engine.layout({
      document,
      pins: { billing: pin },
    });
    assert.equal(result.status, LAYOUT_STATUS.LAID_OUT);
    if (result.status === LAYOUT_STATUS.LAID_OUT) {
      assert.equal(result.positions.billing?.x, pin.x);
      assert.equal(result.positions.billing?.y, pin.y);
    }
  } finally {
    await engine.dispose();
  }
});

test("overlapping pins yield a conflict and do not move the pins", async () => {
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
    if (result.status === LAYOUT_STATUS.CONFLICT) {
      assert.equal(result.conflict.code, LAYOUT_CONFLICT_CODE.INSUFFICIENT_SPACE);
      assert.ok(result.conflict.pinnedNodeIds.includes("billing"));
      assert.ok(result.conflict.pinnedNodeIds.includes("notify"));
      assert.deepEqual(result.conflict.pins.notify, { x: origin.x + 4, y: origin.y + 4 });
    }
  } finally {
    await engine.dispose();
  }
});

test("a newer layout request discards the older worker result", async () => {
  const engine = createLayoutEngine();
  try {
    const document = await load("nested-groups.json");
    const first = engine.layout({ document });
    const second = engine.layout({ document });
    const [older, newer] = await Promise.all([first, second]);
    assert.equal(older.status, LAYOUT_STATUS.SUPERSEDED);
    assert.equal(newer.status, LAYOUT_STATUS.LAID_OUT);
  } finally {
    await engine.dispose();
  }
});

test("invalid documents do not reach ELK", async () => {
  const engine = createLayoutEngine();
  try {
    const result = await engine.layout({ document: { schemaVersion: 1, id: "x" } });
    assert.equal(result.status, LAYOUT_STATUS.INVALID);
  } finally {
    await engine.dispose();
  }
});
