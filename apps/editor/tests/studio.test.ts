import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import { STUDIO_HEADER } from "../src/constants/studio.ts";
import { PERSIST_ERROR_CODE, PersistError } from "../src/persist/errors.ts";
import { studioStore } from "../src/persist/studio.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

test("studio store loads and saves through the session header", async () => {
  const original = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const result = validateDocument(original);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  let stored = original;
  let etag = '"v1"';
  const store = studioStore({ token: "secret", fileName: "diagram.json" }, (async (input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get(STUDIO_HEADER), "secret");
    if (!init?.method || init.method === "GET") {
      return new Response(JSON.stringify(stored), { status: 200, headers: { etag } });
    }
    assert.equal(headers.get("If-Match"), etag);
    stored = JSON.parse(String(init.body)) as unknown;
    etag = '"v2"';
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { etag } });
  }) as typeof fetch);
  const loaded = await store.load();
  assert.equal(loaded?.document.id, "doc-nested-groups");
  assert.equal(store.durable, true);
  if (!loaded) return;
  loaded.document = { ...loaded.document, title: "Studio map", revision: loaded.document.revision + 1 };
  await store.save(loaded);
  const saved = stored as { title?: string };
  assert.equal(saved.title, "Studio map");
  const listed = await store.list();
  assert.equal(listed[0]?.title, "diagram.json");
  await assert.rejects(() =>
    store.save({
      ...loaded,
      document: { ...loaded.document, id: "doc-other" },
    }),
  );
});

test("studio store load fails closed on a missing or invalid file", async () => {
  const missing = studioStore({ token: "secret", fileName: "diagram.json" }, (async () => {
    return new Response(JSON.stringify({ ok: false, code: "not_found" }), { status: 404 });
  }) as typeof fetch);
  await assert.rejects(
    () => missing.load(),
    (error: unknown) => error instanceof PersistError && error.code === PERSIST_ERROR_CODE.NOT_FOUND,
  );

  const invalid = studioStore({ token: "secret", fileName: "diagram.json" }, (async () => {
    return new Response("{", { status: 200, headers: { etag: '"v1"' } });
  }) as typeof fetch);
  await assert.rejects(
    () => invalid.load(),
    (error: unknown) => error instanceof PersistError && error.code === PERSIST_ERROR_CODE.IO,
  );
});

test("studio store surfaces conflict separately from a missing file", async () => {
  const original = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const result = validateDocument(original);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const store = studioStore({ token: "secret", fileName: "diagram.json" }, (async (_input, init) => {
    if (!init?.method || init.method === "GET") {
      return new Response(JSON.stringify(original), { status: 200, headers: { etag: '"v1"' } });
    }
    return new Response(JSON.stringify({ ok: false, error: "stale write", code: "conflict" }), { status: 409 });
  }) as typeof fetch);
  const loaded = await store.load();
  assert.ok(loaded);
  await assert.rejects(
    () => store.save(loaded),
    (error: unknown) => error instanceof PersistError && error.code === PERSIST_ERROR_CODE.CONFLICT,
  );
});
