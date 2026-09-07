import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { OPERATION_KIND, validateDocument } from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { positionsFromScene } from "../src/geometry/positions.ts";
import { editPersistReloadExport } from "../src/offline/loop.ts";
import { OFFLINE_CACHE } from "../src/constants/offline.ts";
import { memoryStore } from "../src/persist/memory.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);
const chatSource = fileURLToPath(new URL("../src/chrome/ChatDrawer.tsx", import.meta.url));
const swSource = fileURLToPath(new URL("../public/sw.js", import.meta.url));

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

test("service worker caches same-origin GET and serves it offline", async () => {
  const source = await readFile(swSource, "utf8");
  assert.match(source, /caches\.open/);
  assert.match(source, /cache\.match/);
  assert.match(source, /skipWaiting/);
  assert.match(source, /cache\.addAll/);
  assert.match(source, new RegExp(OFFLINE_CACHE));
  assert.match(source, /caches\.delete/);
  assert.match(source, /startsWith\(CACHE_PREFIX\)/);
});
