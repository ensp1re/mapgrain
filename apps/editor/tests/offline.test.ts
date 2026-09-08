import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { OPERATION_KIND, validateDocument } from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { OFFLINE_CACHE_PREFIX, OFFLINE_MANIFEST_NAME } from "../src/constants/offline.ts";
import { positionsFromScene } from "../src/geometry/positions.ts";
import {
  cachesToDelete,
  collectOfflineManifest,
  renderServiceWorker,
  shouldCacheResponse,
  shouldInterceptFetch,
} from "../src/offline/assets.ts";
import { editPersistReloadExport } from "../src/offline/loop.ts";
import { memoryStore } from "../src/persist/memory.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);
const chatSource = fileURLToPath(new URL("../src/chrome/ChatDrawer.tsx", import.meta.url));

async function fakeDist(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-offline-dist-"));
  await mkdir(join(dir, "assets"), { recursive: true });
  for (const [path, body] of Object.entries(files)) {
    await writeFile(join(dir, path), body);
  }
  return dir;
}

test("edit, persist, reload, and export keep ids and meaning", async () => {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const validated = validateDocument(raw);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const scene = buildScene(validated.document);
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  const originalIds = validated.document.nodes.map((node) => node.id).sort();
  const result = await editPersistReloadExport(
    memoryStore(),
    { document: validated.document, positions: positionsFromScene(scene.scene.nodes) },
    [
      { kind: OPERATION_KIND.SET_TITLE, title: "Offline workspace" },
      { kind: OPERATION_KIND.SET_NODE_LABEL, nodeId: "gateway", label: "Workspace API v2" },
    ],
  );
  assert.equal(result.snapshot.document.title, "Offline workspace");
  assert.equal(result.snapshot.document.nodes.find((node) => node.id === "gateway")?.label, "Workspace API v2");
  assert.deepEqual(result.snapshot.document.nodes.map((node) => node.id).sort(), originalIds);

  const dir = await mkdtemp(join(tmpdir(), "mapgrain-offline-"));
  const jsonPath = join(dir, "diagram.json");
  const svgPath = join(dir, "diagram.svg");
  await writeFile(jsonPath, result.json);
  await writeFile(svgPath, result.svg);
  const exported = JSON.parse(await readFile(jsonPath, "utf8")) as unknown;
  const exportedDoc = validateDocument(exported);
  assert.equal(exportedDoc.ok, true);
  if (!exportedDoc.ok) return;
  assert.equal(exportedDoc.document.title, "Offline workspace");
  assert.deepEqual(exportedDoc.document.nodes.map((node) => node.id).sort(), originalIds);
  const svg = await readFile(svgPath, "utf8");
  assert.match(svg, /Workspace API v2/);
  assert.match(svg, /<svg/);
});

test("chat does not claim generation it cannot do", async () => {
  const source = await readFile(chatSource, "utf8");
  assert.match(source, /Generation is not configured/);
  assert.match(source, /does not\s+invent/);
  assert.equal(/here is (your )?diagram/i.test(source), false);
});

test("offline manifest precaches html, entry, fonts, and the ELK worker", async () => {
  const dir = await fakeDist({
    "index.html": `<script src="/assets/index-aaa.js"></script><link href="/assets/index-aaa.css">`,
    "assets/index-aaa.js": "console.log('app')",
    "assets/index-aaa.css": "body{}",
    "assets/elk-worker-bbb.js": "/* elk */",
    "assets/inter-latin-500-normal.woff2": "font",
  });
  const manifest = await collectOfflineManifest(dir);
  assert.ok(manifest.version.length >= 8);
  assert.ok(manifest.assets.includes("/"));
  assert.ok(manifest.assets.includes("/index.html"));
  assert.ok(manifest.assets.includes("/assets/index-aaa.js"));
  assert.ok(manifest.assets.includes("/assets/index-aaa.css"));
  assert.ok(manifest.assets.includes("/assets/elk-worker-bbb.js"));
  assert.ok(manifest.assets.includes("/assets/inter-latin-500-normal.woff2"));
  assert.ok(manifest.assets.includes(`/${OFFLINE_MANIFEST_NAME}`));
  const worker = renderServiceWorker(manifest);
  assert.match(worker, new RegExp(`PREFIX = "${OFFLINE_CACHE_PREFIX}"`));
  assert.match(worker, new RegExp(`VERSION = "${manifest.version}"`));
  assert.match(worker, /\/assets\/elk-worker-bbb\.js/);
  assert.match(worker, /cache\.addAll\(ASSETS\)/);
  assert.match(worker, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /searchParams\.has\("session"\)/);
});

test("a changed asset produces a new cache version and drops the previous cache name", async () => {
  const firstDir = await fakeDist({
    "index.html": `<script src="/assets/index-aaa.js"></script>`,
    "assets/index-aaa.js": "v1",
    "assets/elk-worker-bbb.js": "elk",
  });
  const first = await collectOfflineManifest(firstDir);
  const secondDir = await fakeDist({
    "index.html": `<script src="/assets/index-ccc.js"></script>`,
    "assets/index-ccc.js": "v2",
    "assets/elk-worker-bbb.js": "elk",
  });
  const second = await collectOfflineManifest(secondDir);
  assert.notEqual(first.version, second.version);
  assert.equal(first.assets.includes("/assets/index-aaa.js"), true);
  assert.equal(second.assets.includes("/assets/index-aaa.js"), false);
  assert.equal(second.assets.includes("/assets/index-ccc.js"), true);
  const leftover = cachesToDelete(
    [`${OFFLINE_CACHE_PREFIX}${first.version}`, `${OFFLINE_CACHE_PREFIX}${second.version}`, "unrelated"],
    OFFLINE_CACHE_PREFIX,
    `${OFFLINE_CACHE_PREFIX}${second.version}`,
  );
  assert.deepEqual(leftover, [`${OFFLINE_CACHE_PREFIX}${first.version}`]);
});

test("service worker fetch policy skips API, sessions, and no-store responses", () => {
  assert.equal(shouldInterceptFetch("GET", new URL("http://127.0.0.1/index.html")), true);
  assert.equal(shouldInterceptFetch("PUT", new URL("http://127.0.0.1/index.html")), false);
  assert.equal(shouldInterceptFetch("GET", new URL("http://127.0.0.1/api/document")), false);
  assert.equal(shouldInterceptFetch("GET", new URL("http://127.0.0.1/?session=secret")), false);
  assert.equal(
    shouldCacheResponse(200, new Headers({ "cache-control": "no-store", "set-cookie": "mg=1" })),
    false,
  );
  assert.equal(shouldCacheResponse(200, new Headers({ "cache-control": "public" })), true);
  assert.equal(shouldCacheResponse(404, new Headers()), false);
});
