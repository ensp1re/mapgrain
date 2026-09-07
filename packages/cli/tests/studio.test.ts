import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { STUDIO_HEADER } from "../src/constants/cli.ts";
import { startStudio } from "../src/studio.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);
const assets = fileURLToPath(new URL("../fixtures/studio", import.meta.url));

test("studio serves the opened file and rejects a bad session", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-"));
  const file = join(dir, "diagram.json");
  await writeFile(file, await readFile(fixture));
  const server = await startStudio(file, assets);
  try {
    const page = await fetch(server.url);
    const html = await page.text();
    assert.match(html, /__MAPGRAIN_STUDIO__/);
    assert.equal(page.status, 200);
    const doc = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    const body = (await doc.json()) as { title?: string };
    assert.equal(body.title, "Local diagram workspace");
    const denied = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      method: "PUT",
      headers: { [STUDIO_HEADER]: "nope", "content-type": "application/json" },
      body: JSON.stringify({ title: "stolen" }),
    });
    assert.equal(denied.status, 403);
    const next = { ...(body as object), title: "Studio edit" };
    const saved = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      method: "PUT",
      headers: { [STUDIO_HEADER]: server.token, "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    assert.equal(saved.status, 200);
    const written = JSON.parse(await readFile(file, "utf8")) as { title?: string };
    assert.equal(written.title, "Studio edit");
    const traversal = await fetch(`http://127.0.0.1:${server.port}/%2e%2e/package.json`);
    assert.equal(traversal.status, 404);
  } finally {
    await server.close();
  }
});

test("studio binds the next loopback port when the default is taken", async () => {
  const blocker = createServer();
  await new Promise<void>((resolve, reject) => {
    blocker.once("error", reject);
    blocker.listen(4173, "127.0.0.1", () => resolve());
  });
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-port-"));
  const file = join(dir, "diagram.json");
  await writeFile(file, await readFile(fixture));
  const server = await startStudio(file, assets);
  try {
    assert.notEqual(server.port, 4173);
    const page = await fetch(server.url);
    assert.equal(page.status, 200);
  } finally {
    await server.close();
    await new Promise<void>((resolve, reject) => blocker.close((error) => (error ? reject(error) : resolve())));
  }
});
