import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DOCUMENT_KIND,
  NODE_KIND,
  conversionSummary,
  convertDocument,
  validateDocument,
} from "../src/index.ts";

async function load(relative: string) {
  const raw = JSON.parse(
    await readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8"),
  ) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture invalid");
  return result.document;
}

test("architecture to workflow keeps gateway and job and drops the rest", async () => {
  const document = await load("../../../tests/fixtures/documents/nested-groups.json");
  const preview = convertDocument(document, DOCUMENT_KIND.WORKFLOW);
  assert.deepEqual(
    preview.nodes.map((item) => `${item.id}:${item.action}:${item.to ?? "drop"}`).sort(),
    [
      "document:drop:drop",
      "gateway:keep:gateway",
      "layout:keep:job",
      "provider:drop:drop",
      "renderer:drop:drop",
    ],
  );
  assert.equal(preview.document.kind, DOCUMENT_KIND.WORKFLOW);
  assert.deepEqual(preview.document.nodes.map((node) => node.kind).sort(), ["gateway", "job"]);
  const validated = validateDocument(preview.document);
  assert.equal(validated.ok, true);
  assert.match(conversionSummary(preview), /drop /);
});

test("data-flow to architecture remaps process to service and keeps the store", async () => {
  const document = await load("../../../tests/fixtures/documents/data-flow-ingest.json");
  const preview = convertDocument(document, DOCUMENT_KIND.ARCHITECTURE);
  const capture = preview.nodes.find((item) => item.id === "capture");
  const records = preview.nodes.find((item) => item.id === "records");
  const user = preview.nodes.find((item) => item.id === "user");
  assert.equal(capture?.action, "remap");
  assert.equal(capture?.to, NODE_KIND.SERVICE);
  assert.equal(records?.action, "keep");
  assert.equal(records?.to, NODE_KIND.DATASTORE);
  assert.equal(user?.action, "remap");
  assert.equal(user?.to, NODE_KIND.DATASTORE);
  const validated = validateDocument(preview.document);
  assert.equal(validated.ok, true);
});

test("architecture to lifecycle remaps every node to state and stamps an initial marker", async () => {
  const document = await load("../../../tests/fixtures/documents/nested-groups.json");
  const preview = convertDocument(document, DOCUMENT_KIND.LIFECYCLE);
  assert.ok(preview.nodes.every((item) => item.to === NODE_KIND.STATE));
  assert.equal(preview.document.nodes.every((node) => node.kind === NODE_KIND.STATE), true);
  assert.equal(preview.document.nodes.some((node) => node.marker === "initial"), true);
  const validated = validateDocument(preview.document);
  assert.equal(validated.ok, true);
});
