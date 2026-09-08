import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import { buildScene, edgeCaption, portOffset } from "../src/index.ts";
import type { TextMeasurer } from "../src/types/options.ts";
import type { ScenePort } from "../src/types/scene.ts";

const fixturesDir = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

async function load(name: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(fixturesDir, name), "utf8")) as unknown;
}

function scaledMeasurer(factor: number): TextMeasurer {
  return {
    measure(text, font) {
      return { width: text.length * font.size * factor, height: font.lineHeight };
    },
  };
}

test("invalid documents do not produce a scene", () => {
  const result = buildScene({ schemaVersion: 1, id: "x" });
  assert.equal(result.ok, false);
});

test("scene size follows the measurer", async () => {
  const raw = await load("parallel-edges.json");
  const narrow = buildScene(raw, { measurer: scaledMeasurer(0.2) });
  const wide = buildScene(raw, { measurer: scaledMeasurer(1.4) });
  assert.equal(narrow.ok, true);
  assert.equal(wide.ok, true);
  if (narrow.ok && wide.ok) {
    const a = narrow.scene.nodes.find((node) => node.id === "api");
    const b = wide.scene.nodes.find((node) => node.id === "api");
    assert.ok(a && b);
    assert.ok(b.rect.width > a.rect.width);
  }
});

test("port offsets stay stable when the node is translated", async () => {
  const raw = await load("nested-groups.json");
  const first = buildScene(raw, { positions: { gateway: { x: 0, y: 0 } } });
  const second = buildScene(raw, { positions: { gateway: { x: 120, y: 80 } } });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (first.ok && second.ok) {
    const a = first.scene.nodes.find((node) => node.id === "gateway");
    const b = second.scene.nodes.find((node) => node.id === "gateway");
    assert.ok(a && b);
    assert.equal(a.ports.length, b.ports.length);
    for (const port of a.ports) {
      const other: ScenePort | undefined = b.ports.find((item) => item.id === port.id);
      assert.ok(other);
      if (!other) continue;
      assert.deepEqual(portOffset(port, a.rect), portOffset(other, b.rect));
      assert.equal(port.side, other.side);
    }
  }
});

test("explicit port ids survive the scene pass", async () => {
  const raw = await load("nested-groups.json");
  const result = buildScene(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    const gateway = result.scene.nodes.find((node) => node.id === "gateway");
    assert.ok(gateway);
    assert.deepEqual(
      gateway.ports.map((port) => port.id).sort(),
      ["in", "out"],
    );
    const edge = result.scene.edges.find((item) => item.id === "e-gateway-document");
    assert.equal(edge?.source.portId, "out");
    assert.equal(edge?.target.portId, "in");
  }
});

test("parallel edges keep type and label as a single caption", async () => {
  assert.equal(edgeCaption("reads", "get"), "reads · get");
  assert.equal(edgeCaption("writes", "set"), "writes · set");
  const raw = await load("parallel-edges.json");
  const result = buildScene(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const read = result.scene.edges.find((edge) => edge.id === "e-read");
  const write = result.scene.edges.find((edge) => edge.id === "e-write");
  assert.equal(read?.caption, "reads · get");
  assert.equal(write?.caption, "writes · set");
  assert.notEqual(read?.labelAnchor.y, write?.labelAnchor.y);
});

test("multiline labels become multiple lines", () => {
  const raw = validateDocument({
    schemaVersion: 1,
    id: "doc-lines",
    revision: 1,
    kind: "architecture",
    title: "Lines",
    theme: "dark",
    layoutHints: { direction: "right", pinnedNodeIds: [] },
    groups: [],
    nodes: [
      {
        id: "n1",
        kind: "service",
        label: "first line\nsecond line",
        groupId: null,
        ports: [],
      },
    ],
    edges: [],
    views: [{ id: "overview", kind: "overview", name: "Overview" }],
  });
  assert.equal(raw.ok, true);
  if (!raw.ok) return;
  const scene = buildScene(raw.document);
  assert.equal(scene.ok, true);
  if (scene.ok) {
    const node = scene.scene.nodes[0];
    assert.equal(node?.label.lines.length, 2);
    assert.equal(node.label.lines[0]?.text, "first line");
    assert.equal(node.label.lines[1]?.text, "second line");
  }
});

test("long labels wrap at maxLabelWidth", async () => {
  const raw = await load("long-labels.json");
  const result = buildScene(raw, { maxLabelWidth: 80 });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.scene.nodes.every((node) => node.label.lines.length > 1));
    assert.ok(result.scene.nodes.every((node) => node.label.lines.every((line) => line.width <= 80 + 1e-6)));
  }
});

test("nested group bounds contain member nodes", async () => {
  const raw = await load("nested-groups.json");
  const result = buildScene(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    const pipeline = result.scene.groups.find((group) => group.id === "pipeline");
    const runtime = result.scene.groups.find((group) => group.id === "runtime");
    assert.ok(pipeline && runtime);
    const members = result.scene.nodes.filter((node) => node.groupId === "pipeline");
    for (const node of members) {
      assert.ok(node.rect.x >= pipeline.rect.x);
      assert.ok(node.rect.y >= pipeline.rect.y);
      assert.ok(node.rect.x + node.rect.width <= pipeline.rect.x + pipeline.rect.width);
      assert.ok(node.rect.y + node.rect.height <= pipeline.rect.y + pipeline.rect.height);
    }
    assert.ok(pipeline.rect.x >= runtime.rect.x);
    assert.ok(pipeline.rect.y >= runtime.rect.y);
  }
});

test("parallel edges share endpoints and take distinct paths", async () => {
  const raw = await load("parallel-edges.json");
  const result = buildScene(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    const [first, second] = result.scene.edges;
    assert.ok(first && second);
    assert.equal(first.source.nodeId, second.source.nodeId);
    assert.equal(first.target.nodeId, second.target.nodeId);
    assert.notDeepEqual(first.points, second.points);
  }
});

test("disconnected nodes still receive bounds", async () => {
  const raw = await load("disconnected.json");
  const result = buildScene(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.scene.nodes.length, 4);
    assert.ok(result.scene.nodes.every((node) => node.rect.width > 0 && node.rect.height > 0));
    assert.ok(result.scene.bounds.width > 0);
  }
});

test("every original fixture builds a scene", async () => {
  const names = [
    "nested-groups.json",
    "cycle.json",
    "parallel-edges.json",
    "long-labels.json",
    "disconnected.json",
    "workflow-review.json",
  ];
  for (const name of names) {
    const result = buildScene(await load(name));
    assert.equal(result.ok, true, name);
  }
});
