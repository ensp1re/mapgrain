import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { SAVE_STATE } from "../src/constants/persist.ts";
import { positionsFromScene } from "../src/geometry/positions.ts";
import { backupBytes, snapshotFromStored } from "../src/persist/codec.ts";
import { failingStore, memoryStore } from "../src/persist/memory.ts";
import type { EditorSnapshot } from "../src/types/editor.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

async function snapshot(): Promise<EditorSnapshot> {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("invalid fixture");
  const scene = buildScene(result.document);
  assert.equal(scene.ok, true);
  if (!scene.ok) throw new Error("scene failed");
  return { document: result.document, positions: positionsFromScene(scene.scene.nodes) };
}

test("memory store round-trips a document and positions", async () => {
  const original = await snapshot();
  const store = memoryStore();
  await store.save(original);
  const loaded = await store.load();
  assert.equal(loaded?.document.title, original.document.title);
  assert.equal(loaded?.document.revision, original.document.revision);
  assert.deepEqual(loaded?.positions.gateway, original.positions.gateway);
});

test("corrupt stored records are ignored", () => {
  assert.equal(snapshotFromStored(null), null);
  assert.equal(snapshotFromStored({ document: { schemaVersion: 1 } }), null);
});

test("storage failure still yields a valid JSON backup", async () => {
  const original = await snapshot();
  const store = failingStore();
  await assert.rejects(() => store.save(original));
  const bytes = backupBytes(original);
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  const validated = validateDocument(parsed);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.document.title, original.document.title);
  assert.deepEqual(validated.document.layout?.positions.gateway, original.positions.gateway);
});

test("imported backup JSON restores the arrangement", async () => {
  const original = await snapshot();
  original.positions.gateway = { x: -80, y: 24 };
  const parsed = JSON.parse(new TextDecoder().decode(backupBytes(original))) as unknown;
  const restored = snapshotFromStored(parsed);
  assert.equal(restored?.positions.gateway?.x, -80);
  assert.equal(restored?.positions.gateway?.y, 24);
});

test("save states cover saved, saving, recovery, and temporary session", () => {
  assert.equal(SAVE_STATE.SAVED, "Saved");
  assert.equal(SAVE_STATE.SAVING, "Saving");
  assert.equal(SAVE_STATE.RECOVERY, "Recovery");
  assert.equal(SAVE_STATE.TEMPORARY, "Temporary session");
});

test("two diagrams save and load independently", async () => {
  const first = await snapshot();
  const second = {
    ...first,
    document: { ...first.document, id: "doc-other", title: "Other map", revision: 1 },
  };
  const store = memoryStore();
  assert.equal(store.durable, false);
  await store.save(first);
  await store.save(second);
  const listed = await store.list();
  assert.equal(listed.length, 2);
  const loadedFirst = await store.load(first.document.id);
  const loadedSecond = await store.load("doc-other");
  assert.equal(loadedFirst?.document.id, first.document.id);
  assert.equal(loadedSecond?.document.title, "Other map");
});
