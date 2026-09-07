import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { documentJsonSchema, validateDocument } from "../src/index.ts";

const fixturesDir = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));
const schemaFile = fileURLToPath(new URL("../schema/document.v1.json", import.meta.url));

const requiredFixtures = [
  "nested-groups.json",
  "cycle.json",
  "parallel-edges.json",
  "long-labels.json",
  "disconnected.json",
  "workflow-review.json",
  "hundred-nodes.json",
];

test("every original fixture validates", async () => {
  const names = (await readdir(fixturesDir)).filter((name) => name.endsWith(".json")).sort();
  for (const name of requiredFixtures) {
    assert.ok(names.includes(name), `missing fixture ${name}`);
  }
  for (const name of names) {
    const raw = JSON.parse(await readFile(path.join(fixturesDir, name), "utf8")) as unknown;
    const result = validateDocument(raw);
    assert.equal(result.ok, true, `${name} failed: ${JSON.stringify(result)}`);
  }
});

test("hundred-node fixture is original and has 100 nodes", async () => {
  const raw = JSON.parse(await readFile(path.join(fixturesDir, "hundred-nodes.json"), "utf8"));
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.nodes.length, 100);
  assert.equal(result.document.id, "doc-hundred-nodes");
  assert.equal(result.document.title, "Local telemetry mesh");
});

test("nested groups keep parent links", async () => {
  const raw = JSON.parse(await readFile(path.join(fixturesDir, "nested-groups.json"), "utf8"));
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    const nested = result.document.groups.find((group) => group.id === "pipeline");
    assert.equal(nested?.parentId, "runtime");
    assert.ok(result.document.nodes.some((node) => node.groupId === "pipeline"));
  }
});

test("cycle fixture contains a closed edge loop", async () => {
  const raw = JSON.parse(await readFile(path.join(fixturesDir, "cycle.json"), "utf8"));
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    const targets = new Set(result.document.edges.map((edge) => edge.target.nodeId));
    const sources = new Set(result.document.edges.map((edge) => edge.source.nodeId));
    for (const node of result.document.nodes) {
      assert.ok(sources.has(node.id) && targets.has(node.id));
    }
  }
});

test("parallel edges share endpoints and keep distinct ids", async () => {
  const raw = JSON.parse(await readFile(path.join(fixturesDir, "parallel-edges.json"), "utf8"));
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    const [first, second] = result.document.edges;
    assert.ok(first && second);
    assert.equal(first.source.nodeId, second.source.nodeId);
    assert.equal(first.target.nodeId, second.target.nodeId);
    assert.notEqual(first.id, second.id);
    assert.notEqual(first.type, second.type);
  }
});

test("long labels remain in the document", async () => {
  const raw = JSON.parse(await readFile(path.join(fixturesDir, "long-labels.json"), "utf8"));
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.document.nodes.every((node) => node.label.length > 40));
  }
});

test("disconnected fixture has an isolated node pair", async () => {
  const raw = JSON.parse(await readFile(path.join(fixturesDir, "disconnected.json"), "utf8"));
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (result.ok) {
    const connected = new Set<string>();
    for (const edge of result.document.edges) {
      connected.add(edge.source.nodeId);
      connected.add(edge.target.nodeId);
    }
    const isolated = result.document.nodes.filter((node) => !connected.has(node.id));
    assert.ok(isolated.length >= 2);
  }
});

test("committed JSON Schema matches the TypeBox schema", async () => {
  const committed = JSON.parse(await readFile(schemaFile, "utf8")) as unknown;
  assert.deepEqual(committed, documentJsonSchema());
});
