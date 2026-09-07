import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import { STUDIO_HEADER } from "../src/constants/studio.ts";
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
  const store = studioStore({ token: "secret", fileName: "diagram.json" }, (async (input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get(STUDIO_HEADER), "secret");
    if (!init?.method || init.method === "GET") {
      return new Response(JSON.stringify(stored), { status: 200 });
    }
    stored = JSON.parse(String(init.body)) as unknown;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
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
});
