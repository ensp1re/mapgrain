import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DOCUMENT_KIND,
  EDGE_DIRECTION,
  EDGE_TYPE,
  NODE_KIND,
  OPERATION_KIND,
  applyOperation,
  validateDocument,
} from "@mapgrain/document";
import { JOB_STAGE, JOB_STATUS, REPAIR_ACTION } from "../src/constants/create.ts";
import { blankDocument } from "../src/create/blank.ts";
import { EXAMPLES } from "../src/create/examples.ts";
import { makeNode } from "../src/create/nodes.ts";
import { importDocumentText } from "../src/create/importDocument.ts";
import { runCreateJob } from "../src/create/job.ts";
import { isProviderConfigured } from "../src/create/provider.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

test("a blank diagram validates and can become Browser, API, Database with a group", () => {
  let document = blankDocument(DOCUMENT_KIND.ARCHITECTURE, "Review map");
  const validated = validateDocument(document);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const browser = makeNode("browser", NODE_KIND.ACTOR, "Browser");
  const api = makeNode("api", NODE_KIND.SERVICE, "API");
  const db = makeNode("db", NODE_KIND.DATASTORE, "Database");
  for (const node of [browser, api, db]) {
    const added = applyOperation(document, { kind: OPERATION_KIND.ADD_NODE, node });
    assert.equal(added.ok, true);
    if (!added.ok) return;
    document = added.document;
  }
  const grouped = applyOperation(document, {
    kind: OPERATION_KIND.ADD_GROUP,
    id: "backend",
    label: "Backend",
  });
  assert.equal(grouped.ok, true);
  if (!grouped.ok) return;
  document = grouped.document;
  const inGroup = applyOperation(document, {
    kind: OPERATION_KIND.SET_NODE_GROUP,
    nodeId: "api",
    groupId: "backend",
  });
  assert.equal(inGroup.ok, true);
  if (!inGroup.ok) return;
  document = inGroup.document;
  const linked = applyOperation(document, {
    kind: OPERATION_KIND.ADD_EDGE,
    id: "e-browser-api",
    source: { nodeId: "browser", portId: "out" },
    target: { nodeId: "api", portId: "in" },
    type: EDGE_TYPE.CALLS,
    direction: EDGE_DIRECTION.FORWARD,
  });
  assert.equal(linked.ok, true);
  if (!linked.ok) return;
  assert.equal(linked.document.nodes.map((node) => node.label).sort().join(","), "API,Browser,Database");
  const ungrouped = applyOperation(linked.document, { kind: OPERATION_KIND.DELETE_GROUP, groupId: "backend" });
  assert.equal(ungrouped.ok, true);
  if (!ungrouped.ok) return;
  assert.equal(ungrouped.document.nodes.find((node) => node.id === "api")?.groupId, null);
  assert.equal(ungrouped.document.nodes.length, 3);
});

test("start surface offers blank, file, examples, and agent path", async () => {
  const source = await readFile(new URL("../src/chrome/StartSurface.tsx", import.meta.url), "utf8");
  assert.match(source, /New blank diagram/);
  assert.match(source, /Open file/);
  assert.match(source, /Use with your agent/);
  assert.match(source, /Recent diagrams/);
  assert.match(source, /npx skills add ensp1re\/mapgrain --skill mapgrain/);
  assert.match(source, /--agent cursor/);
  assert.match(source, /npx mapgrain@0\.1\.0 validate/);
  assert.doesNotMatch(source, /pnpm mapgrain validate/);
  assert.doesNotMatch(source, /Describe a diagram/);
});

test("examples are original fixtures labelled as examples, not generated output", () => {
  assert.equal(EXAMPLES.length, 3);
  for (const example of EXAMPLES) {
    assert.equal(example.kind, "example");
    assert.equal(/generated output/i.test(`${example.title} ${example.blurb}`), false);
  }
});

test("examples load without a model provider", () => {
  assert.equal(isProviderConfigured({}), false);
  const loaded = EXAMPLES.map((example) => importDocumentText(JSON.stringify(example.document)));
  for (const result of loaded) {
    assert.equal("snapshot" in result, true);
    if ("snapshot" in result) {
      assert.ok(result.snapshot.document.nodes.length > 0);
    }
  }
});

test("submit without a provider fails, keeps the prompt, and offers a repair", async () => {
  const result = await runCreateJob("draw the review loop", {
    providerConfigured: false,
    signal: new AbortController().signal,
    tickMs: 0,
  });
  assert.equal(result.status, JOB_STATUS.FAILED);
  assert.equal(result.prompt, "draw the review loop");
  assert.equal(result.stage, JOB_STAGE.INTERPRETING);
  assert.equal(result.repair, REPAIR_ACTION.OPEN_EXAMPLE);
  assert.match(result.message ?? "", /not configured/i);
});

test("submit can be cancelled and returns the entered text", async () => {
  const controller = new AbortController();
  const pending = runCreateJob("keep this text", {
    providerConfigured: false,
    signal: controller.signal,
    tickMs: 50,
  });
  controller.abort();
  const result = await pending;
  assert.equal(result.status, JOB_STATUS.CANCELLED);
  assert.equal(result.prompt, "keep this text");
});

test("import accepts a valid document and rejects junk", async () => {
  const raw = await readFile(fixture, "utf8");
  const ok = importDocumentText(raw);
  assert.equal("snapshot" in ok, true);
  if ("snapshot" in ok) {
    assert.equal(ok.snapshot.document.id, "doc-nested-groups");
  }
  const badJson = importDocumentText("{");
  assert.equal("error" in badJson, true);
  const badDoc = importDocumentText(JSON.stringify({ schemaVersion: 1 }));
  assert.equal("error" in badDoc, true);
});
