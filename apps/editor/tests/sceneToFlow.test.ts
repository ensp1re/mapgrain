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
  assert.equal(edge?.preserveGeometry, false);
  const gateway = flow.nodes.find((node) => node.id === "gateway");
  assert.equal(gateway?.data.kindFill, "gateway");
});

test("lifecycle flow exposes markers and tones and hides STATE as a chip", async () => {
  const raw = JSON.parse(
    await readFile(
      fileURLToPath(new URL("../../../tests/fixtures/documents/lifecycle-session.json", import.meta.url)),
      "utf8",
    ),
  ) as unknown;
  const scene = buildScene(raw);
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  const flow = sceneToFlow(scene.scene);
  const idle = flow.nodes.find((node) => node.id === "idle");
  const closed = flow.nodes.find((node) => node.id === "closed");
  assert.equal(idle?.data.marker, "initial");
  assert.equal(idle?.data.stateTone, "start");
  assert.equal(closed?.data.marker, "final");
  assert.equal(closed?.data.stateTone, "done");
  assert.equal(idle?.data.kindFill, undefined);
});

test("west source ports stay sources so those edges can paint", async () => {
  const raw = {
    schemaVersion: 1,
    id: "doc-west-source",
    revision: 1,
    kind: "architecture",
    title: "West source",
    theme: "dark",
    layoutHints: { direction: "right", pinnedNodeIds: [] },
    groups: [],
    nodes: [
      {
        id: "ext",
        kind: "external",
        label: "Vendor",
        groupId: null,
        ports: [{ id: "out", side: "west" }],
      },
      {
        id: "api",
        kind: "service",
        label: "API",
        groupId: null,
        ports: [{ id: "in", side: "west" }],
      },
    ],
    edges: [
      {
        id: "e1",
        source: { nodeId: "ext", portId: "out" },
        target: { nodeId: "api", portId: "in" },
        type: "calls",
        direction: "forward",
      },
    ],
    views: [{ id: "overview", kind: "overview", name: "All" }],
  };
  const scene = buildScene(raw);
  assert.equal(scene.ok, true, JSON.stringify(scene));
  if (!scene.ok) return;
  const flow = sceneToFlow(scene.scene);
  const ext = flow.nodes.find((node) => node.id === "ext");
  const api = flow.nodes.find((node) => node.id === "api");
  assert.equal(ext?.data.ports[0]?.asSource, true);
  assert.equal(ext?.data.ports[0]?.asTarget, false);
  assert.equal(api?.data.ports[0]?.asSource, false);
  assert.equal(api?.data.ports[0]?.asTarget, true);
});

test("sequence flow keeps lifelines and does not remap message geometry", async () => {
  const raw = JSON.parse(
    await readFile(
      fileURLToPath(new URL("../../../tests/fixtures/documents/sequence-checkout.json", import.meta.url)),
      "utf8",
    ),
  ) as unknown;
  const scene = buildScene(raw);
  assert.equal(scene.ok, true);
  if (!scene.ok) return;
  const flow = sceneToFlow(scene.scene);
  assert.equal(flow.lifelines.length, scene.scene.lifelines.length);
  assert.equal(flow.fragments.length, scene.scene.fragments.length);
  assert.ok(flow.fragments.some((fragment) => fragment.kind === "opt"));
  assert.ok(flow.lifelines.length >= 3);
  const message = flow.edges.find((item) => item.id === "m1");
  const sceneEdge = scene.scene.edges.find((item) => item.id === "m1");
  assert.equal(message?.preserveGeometry, true);
  assert.deepEqual(message?.points, sceneEdge?.points);
  assert.deepEqual(message?.labelAnchor, sceneEdge?.labelAnchor);
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
  assert.match(css, /--topbar-h: 52px/);
  assert.match(css, /\.react-flow__node-group/);
  assert.match(css, /\.topbar-wide/);
  assert.match(css, /\.overlay-panel/);
  assert.match(css, /\.topbar \{[\s\S]*overflow: visible/);
  assert.match(css, /\.node-kind \{[^}]*overflow: visible/);
  assert.doesNotMatch(css, /\.node-kind \{[^}]*text-overflow: ellipsis/);
  assert.match(css, /\.node-card-body/);
  assert.match(css, /\.state-initial/);
  assert.match(css, /data-state-tone="start"/);
  assert.match(css, /--state-start:/);
  assert.match(css, /--kind-service:/);
  assert.match(css, /\.kind-legend \{[^}]*bottom: 72px/);
  assert.match(css, /data-kind-fill="gateway"/);
  assert.match(css, /@media \(max-width: 767px\) \{[\s\S]*\.kind-legend \{[^}]*bottom: 104px/);
});
