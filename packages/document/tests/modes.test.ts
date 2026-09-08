import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DOCUMENT_KIND, NODE_KIND, VALIDATION_ERROR_CODE, validateDocument } from "../src/index.ts";

const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

test("sequence, data-flow, lifecycle, and decision fixtures validate", async () => {
  for (const name of [
    "sequence-checkout.json",
    "data-flow-ingest.json",
    "lifecycle-session.json",
    "workflow-decision.json",
  ]) {
    const result = validateDocument(JSON.parse(await readFile(`${fixtures}/${name}`, "utf8")) as unknown);
    assert.equal(result.ok, true, `${name} ${JSON.stringify(result)}`);
  }
});

test("a decision without two labelled outcomes is rejected", async () => {
  const raw = JSON.parse(await readFile(`${fixtures}/workflow-decision.json`, "utf8")) as {
    nodes: Array<{ id: string; kind: string }>;
    edges: unknown[];
  };
  raw.edges = raw.edges.slice(0, 1);
  const result = validateDocument(raw);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errors[0]?.code, VALIDATION_ERROR_CODE.MODE_CONSTRAINT);
});

test("architecture documents reject sequence node kinds", () => {
  const result = validateDocument({
    schemaVersion: 1,
    id: "doc-bad",
    revision: 1,
    kind: DOCUMENT_KIND.ARCHITECTURE,
    title: "Bad",
    theme: "dark",
    layoutHints: { direction: "right", pinnedNodeIds: [] },
    groups: [],
    nodes: [
      {
        id: "browser",
        kind: NODE_KIND.PARTICIPANT,
        label: "Browser",
        groupId: null,
        ports: [],
      },
    ],
    edges: [],
    views: [{ id: "overview", kind: "overview", name: "All" }],
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errors[0]?.code, VALIDATION_ERROR_CODE.MODE_CONSTRAINT);
});
