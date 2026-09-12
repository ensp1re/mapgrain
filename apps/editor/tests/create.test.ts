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
import { TEMPLATES } from "../src/templates/catalog.ts";
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

test("start surface offers templates, blank modes, file, and agent path", async () => {
  const source = await readFile(new URL("../src/chrome/StartSurface.tsx", import.meta.url), "utf8");
  assert.match(source, /New diagram/);
  assert.match(source, /New \{mode\.title/);
  assert.doesNotMatch(source, /New blank diagram/);
  assert.match(source, /TemplateGallery/);
  assert.match(source, /Or start blank/);
  assert.match(source, /MODE_CHOICES/);
  assert.match(source, /Open file/);
  assert.match(source, /Use with an agent/);
  assert.match(source, /Recent diagrams/);
  assert.match(source, /skillInstallCommand/);
  assert.match(source, /AGENT_CHOICES/);
  assert.match(source, /npx mapgrain@0\.2\.2 validate/);
  assert.doesNotMatch(source, /pnpm mapgrain validate/);
  assert.doesNotMatch(source, /Describe a diagram/);
});

test("commands include switch diagram kind for an existing file", async () => {
  const source = await readFile(new URL("../src/constants/commands.ts", import.meta.url), "utf8");
  assert.match(source, /CONVERT_KIND/);
  assert.match(source, /Switch diagram kind/);
});

test("kind conversion dialog previews keep remap drop before apply", async () => {
  const source = await readFile(new URL("../src/chrome/ConvertKindDialog.tsx", import.meta.url), "utf8");
  assert.match(source, /conversionSummary/);
  assert.match(source, /Dropped:/);
  assert.match(source, /Apply/);
  assert.doesNotMatch(source, /<select[\s>]/);
});

test("mode chooser names every diagram kind", async () => {
  const source = await readFile(new URL("../src/create/modes.ts", import.meta.url), "utf8");
  assert.match(source, /Architecture/);
  assert.match(source, /Workflow/);
  assert.match(source, /Sequence/);
  assert.match(source, /Data flow/);
  assert.match(source, /Lifecycle/);
});

test("templates are original diagrams, not generated output", () => {
  for (const item of TEMPLATES) {
    assert.equal(/generated output/i.test(`${item.title} ${item.blurb}`), false);
    assert.ok(item.document.nodes.length > 0, item.id);
  }
});

test("templates load without a model provider", () => {
  assert.equal(isProviderConfigured({}), false);
  for (const item of TEMPLATES) {
    const result = importDocumentText(JSON.stringify(item.document));
    assert.equal("snapshot" in result, true, item.id);
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
