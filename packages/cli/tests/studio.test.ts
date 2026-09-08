import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readdir, readFile, unlink, writeFile } from "node:fs/promises";
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
    const etag = doc.headers.get("etag");
    assert.ok(etag);
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
      headers: {
        [STUDIO_HEADER]: server.token,
        "content-type": "application/json",
        "if-match": etag,
      },
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

test("invalid studio writes leave the opened file byte-identical", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-invalid-"));
  const file = join(dir, "diagram.json");
  const original = await readFile(fixture);
  await writeFile(file, original);
  const server = await startStudio(file, assets);
  try {
    const loaded = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    const etag = loaded.headers.get("etag") ?? "";
    const numeric = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      method: "PUT",
      headers: {
        [STUDIO_HEADER]: server.token,
        "content-type": "application/json",
        "if-match": etag,
      },
      body: "0",
    });
    assert.equal(numeric.status, 400);
    const stale = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      method: "PUT",
      headers: {
        [STUDIO_HEADER]: server.token,
        "content-type": "application/json",
        "if-match": '"deadbeef"',
      },
      body: await readFile(fixture, "utf8"),
    });
    assert.equal(stale.status, 409);
    assert.deepEqual(await readFile(file), original);
  } finally {
    await server.close();
  }
});

test("studio returns a structured error when the opened file is deleted", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-missing-"));
  const file = join(dir, "diagram.json");
  await writeFile(file, await readFile(fixture));
  const server = await startStudio(file, assets);
  try {
    await unlink(file);
    const missing = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    assert.equal(missing.status, 404);
    const body = (await missing.json()) as { code?: string };
    assert.equal(body.code, "not_found");
  } finally {
    await server.close();
  }
});

test("studio PUT after delete returns not_found without hanging", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-put-missing-"));
  const file = join(dir, "diagram.json");
  await writeFile(file, await readFile(fixture));
  const server = await startStudio(file, assets);
  try {
    const loaded = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    const etag = loaded.headers.get("etag") ?? "";
    const body = (await loaded.json()) as object;
    await unlink(file);
    const saved = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      method: "PUT",
      headers: {
        [STUDIO_HEADER]: server.token,
        "content-type": "application/json",
        "if-match": etag,
      },
      body: JSON.stringify({ ...body, title: "Should fail" }),
    });
    assert.equal(saved.status, 404);
    const report = (await saved.json()) as { code?: string };
    assert.equal(report.code, "not_found");
  } finally {
    await server.close();
  }
});

test("two equal-revision studio writers conflict instead of merging", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-race-"));
  const file = join(dir, "diagram.json");
  await writeFile(file, await readFile(fixture));
  const server = await startStudio(file, assets);
  try {
    const loaded = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    const etag = loaded.headers.get("etag") ?? "";
    const body = (await loaded.json()) as object;
    const headers = {
      [STUDIO_HEADER]: server.token,
      "content-type": "application/json",
      "if-match": etag,
    };
    const [first, second] = await Promise.all([
      fetch(`http://127.0.0.1:${server.port}/api/document`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...body, title: "Writer A" }),
      }),
      fetch(`http://127.0.0.1:${server.port}/api/document`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...body, title: "Writer B" }),
      }),
    ]);
    const statuses = [first.status, second.status].sort((left, right) => left - right);
    assert.deepEqual(statuses, [200, 409]);
    const loser = first.status === 409 ? first : second;
    const report = (await loser.json()) as { code?: string };
    assert.equal(report.code, "conflict");
    const written = JSON.parse(await readFile(file, "utf8")) as { title?: string };
    assert.ok(written.title === "Writer A" || written.title === "Writer B");
  } finally {
    await server.close();
  }
});

test("studio rename failure leaves the opened file and reports rename_failed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-rename-"));
  const file = join(dir, "diagram.json");
  const original = await readFile(fixture);
  await writeFile(file, original);
  const server = await startStudio(file, assets, {
    rename: async () => {
      const error = new Error("busy") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    },
  });
  try {
    const loaded = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    const etag = loaded.headers.get("etag") ?? "";
    const body = (await loaded.json()) as object;
    const saved = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      method: "PUT",
      headers: {
        [STUDIO_HEADER]: server.token,
        "content-type": "application/json",
        "if-match": etag,
      },
      body: JSON.stringify({ ...body, title: "Should not land" }),
    });
    assert.equal(saved.status, 500);
    const report = (await saved.json()) as { code?: string };
    assert.equal(report.code, "rename_failed");
    assert.deepEqual(await readFile(file), original);
    const leftovers = (await readdir(dir)).filter((name) => name.endsWith(".tmp"));
    assert.deepEqual(leftovers, []);
  } finally {
    await server.close();
  }
});

test("external malformed edit conflicts instead of replacing the file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-malformed-"));
  const file = join(dir, "diagram.json");
  await writeFile(file, await readFile(fixture));
  const server = await startStudio(file, assets);
  try {
    const loaded = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    const etag = loaded.headers.get("etag") ?? "";
    const body = (await loaded.json()) as object;
    await writeFile(file, "{not-json");
    const saved = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      method: "PUT",
      headers: {
        [STUDIO_HEADER]: server.token,
        "content-type": "application/json",
        "if-match": etag,
      },
      body: JSON.stringify({ ...body, title: "Should not land" }),
    });
    assert.equal(saved.status, 409);
    assert.equal(await readFile(file, "utf8"), "{not-json");
  } finally {
    await server.close();
  }
});

test("an interrupted studio PUT leaves the server able to serve the file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-studio-abort-"));
  const file = join(dir, "diagram.json");
  await writeFile(file, await readFile(fixture));
  const server = await startStudio(file, assets);
  try {
    const loaded = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    const etag = loaded.headers.get("etag") ?? "";
    const body = (await loaded.json()) as object;
    const abort = new AbortController();
    const pending = fetch(`http://127.0.0.1:${server.port}/api/document`, {
      method: "PUT",
      headers: {
        [STUDIO_HEADER]: server.token,
        "content-type": "application/json",
        "if-match": etag,
      },
      body: JSON.stringify({ ...body, title: "Aborted" }),
      signal: abort.signal,
    });
    abort.abort();
    await assert.rejects(() => pending);
    const again = await fetch(`http://127.0.0.1:${server.port}/api/document`, {
      headers: { [STUDIO_HEADER]: server.token },
    });
    assert.equal(again.status, 200);
    const served = (await again.json()) as { title?: string };
    assert.ok(served.title === "Local diagram workspace" || served.title === "Aborted");
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
