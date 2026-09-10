import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DOCUMENT_KIND, NODE_KIND } from "@mapgrain/document";
import { NODE_SHAPE, buildScene, shapeForNode } from "../src/index.ts";

const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

async function load(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`${fixtures}/${name}`, "utf8")) as unknown;
}

test("data-flow kinds map to process, store, and entity shapes", () => {
  assert.equal(shapeForNode(DOCUMENT_KIND.DATA_FLOW, NODE_KIND.PROCESS), NODE_SHAPE.PROCESS);
  assert.equal(shapeForNode(DOCUMENT_KIND.DATA_FLOW, NODE_KIND.DATASTORE), NODE_SHAPE.STORE);
  assert.equal(shapeForNode(DOCUMENT_KIND.DATA_FLOW, NODE_KIND.ENTITY), NODE_SHAPE.ENTITY);
  assert.equal(shapeForNode(DOCUMENT_KIND.DATA_FLOW, NODE_KIND.EXTERNAL), NODE_SHAPE.ENTITY);
  assert.equal(shapeForNode(DOCUMENT_KIND.ARCHITECTURE, NODE_KIND.DATASTORE), undefined);
  assert.equal(shapeForNode(DOCUMENT_KIND.ARCHITECTURE, NODE_KIND.PROCESS), undefined);
});

test("data-flow scene stamps shapes on process and store nodes", async () => {
  const result = buildScene(await load("data-flow-ingest.json"));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.scene.nodes.find((node) => node.id === "capture")?.shape, NODE_SHAPE.PROCESS);
  assert.equal(result.scene.nodes.find((node) => node.id === "records")?.shape, NODE_SHAPE.STORE);
  assert.equal(result.scene.nodes.find((node) => node.id === "user")?.shape, NODE_SHAPE.ENTITY);
});

test("architecture scene does not stamp data-flow shapes", async () => {
  const result = buildScene(await load("nested-groups.json"));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.scene.nodes.some((node) => node.kind === NODE_KIND.DATASTORE));
  assert.ok(result.scene.nodes.every((node) => node.shape === undefined));
});
