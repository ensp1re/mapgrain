import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildScene } from "@mapgrain/scene";
import { sceneToFlow } from "../src/diagram/sceneToFlow.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

test("sceneToFlow keeps node ids, groups, and port handles", async () => {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const scene = buildScene(raw);
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  const flow = sceneToFlow(scene.scene);
  assert.ok(flow.nodes.some((node) => node.id === "gateway" && node.type === "component"));
  assert.ok(flow.nodes.some((node) => node.id === "runtime" && node.type === "group"));
  const pipeline = flow.nodes.find((node) => node.id === "pipeline");
  assert.equal(pipeline?.parentId, "runtime");
  const edge = flow.edges.find((item) => item.id === "e-gateway-document");
  assert.equal(edge?.sourceHandle, "out");
  assert.equal(edge?.targetHandle, "in");
  assert.ok((edge?.points.length ?? 0) >= 2);
  const sceneEdge = scene.scene.edges.find((item) => item.id === "e-gateway-document");
  assert.deepEqual(edge?.points, sceneEdge?.points);
  assert.equal(edge?.caption, sceneEdge?.caption);
  assert.deepEqual(edge?.labelAnchor, sceneEdge?.labelAnchor);
});

test("specimen CSS covers both themes, a 390px layout, and reduced motion", async () => {
  const cssPath = fileURLToPath(new URL("../src/styles/app.css", import.meta.url));
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /data-theme="light"/);
  assert.match(css, /max-width: 767px/);
  assert.match(css, /max-width: 390px/);
  assert.match(css, /max-width: 1023px/);
  assert.match(css, /min-width: 1440px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /--topbar-h: 48px/);
  assert.match(css, /\.react-flow__node-group/);
  assert.match(css, /\.topbar-wide/);
  assert.match(css, /\.topbar \{[\s\S]*overflow: hidden/);
});
