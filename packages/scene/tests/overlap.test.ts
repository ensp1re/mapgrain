import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DOCUMENT_KIND, validateDocument, type DiagramDocument } from "@mapgrain/document";
import { buildScene, overlappingPairs, type Boxed } from "../src/index.ts";

const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

async function documents(): Promise<Array<{ name: string; document: DiagramDocument }>> {
  const names = (await readdir(fixtures)).filter((name) => name.endsWith(".json"));
  const loaded = [];
  for (const name of names) {
    const raw = JSON.parse(await readFile(join(fixtures, name), "utf8")) as unknown;
    const result = validateDocument(raw);
    assert.equal(result.ok, true, name);
    if (result.ok) loaded.push({ name, document: result.document });
  }
  return loaded;
}

/** Everything the scene draws in a box, so one helper can compare them all. */
function boxes(scene: ReturnType<typeof buildScene>): { captions: Boxed[]; frames: Boxed[]; cards: Boxed[] } {
  if (!scene.ok) throw new Error("scene failed");
  return {
    cards: scene.scene.nodes.map((node) => ({ id: `card:${node.id}`, rect: node.rect })),
    captions: scene.scene.edges
      .filter((edge) => edge.caption)
      .map((edge) => ({ id: `caption:${edge.id}`, rect: edge.labelBox })),
    frames: scene.scene.fragments.map((fragment) => ({ id: `frame:${fragment.id}`, rect: fragment.rect })),
  };
}

test("no caption lands on another caption", async () => {
  for (const { name, document } of await documents()) {
    const scene = buildScene(document, { positions: document.layout?.positions ?? {} });
    assert.equal(scene.ok, true, name);
    const { captions } = boxes(scene);
    assert.deepEqual(overlappingPairs(captions), [], `${name} stacked captions`);
  }
});

test("no caption lands on a card it does not belong to", async () => {
  for (const { name, document } of await documents()) {
    const scene = buildScene(document, { positions: document.layout?.positions ?? {} });
    assert.equal(scene.ok, true, name);
    if (!scene.ok) continue;
    const cards = new Map(scene.scene.nodes.map((node) => [node.id, node.rect]));
    for (const edge of scene.scene.edges) {
      if (!edge.caption) continue;
      const own = new Set([edge.source.nodeId, edge.target.nodeId]);
      const others = [...cards.entries()]
        .filter(([id]) => !own.has(id))
        .map(([id, rect]) => ({ id: `card:${id}`, rect }));
      const hits = overlappingPairs([{ id: `caption:${edge.id}`, rect: edge.labelBox }, ...others]).filter(
        (pair) => pair.startsWith("caption:"),
      );
      assert.deepEqual(hits, [], `${name}: ${edge.id}`);
    }
  }
});

test("two fragment frames never sit on top of each other", async () => {
  for (const { name, document } of await documents()) {
    const scene = buildScene(document, { positions: document.layout?.positions ?? {} });
    assert.equal(scene.ok, true, name);
    const { frames } = boxes(scene);
    assert.deepEqual(overlappingPairs(frames), [], `${name} stacked fragment frames`);
  }
});

test("every routed connection starts and ends on the cards it joins", async () => {
  for (const { name, document } of await documents()) {
    // A sequence message runs between lifelines, below the participant cards, not on them.
    if (document.kind === DOCUMENT_KIND.SEQUENCE) continue;
    const scene = buildScene(document, { positions: document.layout?.positions ?? {} });
    assert.equal(scene.ok, true, name);
    if (!scene.ok) continue;
    const cards = new Map(scene.scene.nodes.map((node) => [node.id, node.rect]));
    for (const edge of scene.scene.edges) {
      const first = edge.points[0];
      const last = edge.points.at(-1);
      if (!first || !last) continue;
      for (const [point, nodeId] of [
        [first, edge.source.nodeId],
        [last, edge.target.nodeId],
      ] as const) {
        const rect = cards.get(nodeId);
        if (!rect) continue;
        // On the boundary, not floating in space: an arrowhead in open space is the symptom.
        const near =
          point.x >= rect.x - 1 &&
          point.x <= rect.x + rect.width + 1 &&
          point.y >= rect.y - 1 &&
          point.y <= rect.y + rect.height + 1;
        assert.ok(near, `${name}: ${edge.id} ends at ${point.x},${point.y} away from ${nodeId}`);
      }
    }
  }
});

test("a sequence message starts and ends on its participants' lifelines", async () => {
  for (const { name, document } of await documents()) {
    if (document.kind !== DOCUMENT_KIND.SEQUENCE) continue;
    const scene = buildScene(document, { positions: document.layout?.positions ?? {} });
    assert.equal(scene.ok, true, name);
    if (!scene.ok) continue;
    const lifeline = new Map(scene.scene.lifelines.map((line) => [line.nodeId, line.x]));
    for (const edge of scene.scene.edges) {
      const first = edge.points[0];
      const last = edge.points.at(-1);
      assert.ok(first && last, `${name}: ${edge.id} drew no points`);
      if (!first || !last) continue;
      assert.equal(first.x, lifeline.get(edge.source.nodeId), `${name}: ${edge.id} source`);
      assert.equal(last.x, lifeline.get(edge.target.nodeId), `${name}: ${edge.id} target`);
    }
  }
});
