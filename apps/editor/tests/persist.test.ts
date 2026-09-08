import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { SAVE_STATE } from "../src/constants/persist.ts";
import { positionsFromScene } from "../src/geometry/positions.ts";
import { backupBytes, snapshotFromStored } from "../src/persist/codec.ts";
import { chooseLastActive } from "../src/persist/active.ts";
import { PERSIST_ERROR_CODE, PersistError, persistErrorFromHttp } from "../src/persist/errors.ts";
import { failingStore, memoryStore } from "../src/persist/memory.ts";
import { createSaveSession } from "../src/persist/session.ts";
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

test("save states cover saved, saving, recovery, temporary session, and file save", () => {
  assert.equal(SAVE_STATE.SAVED, "Saved");
  assert.equal(SAVE_STATE.SAVING, "Saving");
  assert.equal(SAVE_STATE.RECOVERY, "Recovery");
  assert.equal(SAVE_STATE.TEMPORARY, "Temporary session");
  assert.equal(SAVE_STATE.FILE_SAVED, "Saved to file");
  assert.equal(SAVE_STATE.FILE_SAVING, "Saving to file");
});

test("load without an id returns the last-active document, not insertion order", async () => {
  const first = await snapshot();
  const second = {
    ...first,
    document: { ...first.document, id: "doc-later", title: "Later map", revision: 1 },
  };
  const store = memoryStore();
  await store.save(first);
  await store.save(second);
  await store.load(first.document.id);
  const loaded = await store.load();
  assert.equal(loaded?.document.id, first.document.id);
});

test("save updates edited time without resetting last opened", async () => {
  const first = await snapshot();
  const store = memoryStore();
  await store.save(first);
  const opened = await store.load(first.document.id);
  assert.ok(opened);
  const before = (await store.list())[0];
  await new Promise((resolve) => setTimeout(resolve, 5));
  await store.save({
    ...first,
    document: { ...first.document, title: "Renamed map" },
  });
  const after = (await store.list())[0];
  assert.equal(after?.lastOpenedAt, before?.lastOpenedAt);
  assert.notEqual(after?.updatedAt, before?.updatedAt);
});

test("chooseLastActive prefers stored id then most recently opened", () => {
  const records = [
    { id: "a", title: "A", lastOpenedAt: "2026-01-01T00:00:00.000Z" },
    { id: "b", title: "B", lastOpenedAt: "2026-02-01T00:00:00.000Z" },
  ];
  assert.equal(chooseLastActive(records, "a"), "a");
  assert.equal(chooseLastActive(records, "missing"), "b");
  assert.equal(chooseLastActive(records, null), "b");
  assert.equal(
    chooseLastActive(
      [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      null,
    ),
    "b",
  );
});

test("save session reports Saved only after the write finishes", async () => {
  const original = await snapshot();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const inner = memoryStore();
  const store = {
    durable: true,
    load: (id?: string) => inner.load(id),
    list: () => inner.list(),
    async save(snapshot: EditorSnapshot) {
      await gate;
      await inner.save(snapshot);
    },
  };
  const states: string[] = [];
  const session = createSaveSession({
    store,
    delayMs: 5,
    fileBacked: false,
    onState: (state) => states.push(state),
    onError: () => undefined,
  });
  session.schedule(original);
  assert.ok(states.includes(SAVE_STATE.SAVING));
  assert.equal(states.includes(SAVE_STATE.SAVED), false);
  release();
  await session.flush();
  assert.equal(states.at(-1), SAVE_STATE.SAVED);
  session.dispose();
});

test("save session flush writes a pending snapshot before switching", async () => {
  const original = await snapshot();
  original.document = { ...original.document, title: "Pending title" };
  const store = memoryStore();
  const durable = {
    durable: true,
    load: (id?: string) => store.load(id),
    list: () => store.list(),
    save: (snapshot: EditorSnapshot) => store.save(snapshot),
  };
  const session = createSaveSession({
    store: durable,
    delayMs: 30_000,
    fileBacked: false,
    onState: () => undefined,
    onError: () => undefined,
  });
  session.schedule(original);
  await session.flush();
  const loaded = await store.load(original.document.id);
  assert.equal(loaded?.document.title, "Pending title");
  session.dispose();
});

test("HTTP persist errors distinguish conflict, missing file, and disk full", () => {
  assert.equal(persistErrorFromHttp(409, { code: "conflict" }).code, PERSIST_ERROR_CODE.CONFLICT);
  assert.equal(persistErrorFromHttp(404, {}).code, PERSIST_ERROR_CODE.NOT_FOUND);
  assert.equal(persistErrorFromHttp(403, {}).code, PERSIST_ERROR_CODE.PERMISSION);
  assert.equal(persistErrorFromHttp(428, {}).code, PERSIST_ERROR_CODE.IF_MATCH);
  assert.equal(persistErrorFromHttp(507, {}).code, PERSIST_ERROR_CODE.DISK_FULL);
  assert.equal(persistErrorFromHttp(500, { code: "rename_failed" }).code, PERSIST_ERROR_CODE.RENAME_FAILED);
  const conflict = new PersistError(PERSIST_ERROR_CODE.CONFLICT, "conflict");
  assert.equal(conflict.code, PERSIST_ERROR_CODE.CONFLICT);
});

test("failed save stays in Recovery and later flush does not report Saved", async () => {
  const original = await snapshot();
  const store = {
    durable: true,
    load: async () => null,
    list: async () => [],
    async save() {
      throw new PersistError(PERSIST_ERROR_CODE.CONFLICT, "stale");
    },
  };
  const states: string[] = [];
  const session = createSaveSession({
    store,
    delayMs: 30_000,
    fileBacked: false,
    onState: (state) => states.push(state),
    onError: () => undefined,
  });
  session.schedule(original);
  await assert.rejects(
    () => session.flush(),
    (error: unknown) => error instanceof PersistError && error.code === PERSIST_ERROR_CODE.CONFLICT,
  );
  assert.equal(states.at(-1), SAVE_STATE.RECOVERY);
  assert.equal(states.includes(SAVE_STATE.SAVED), false);
  await assert.rejects(() => session.flush());
  session.dispose();
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
