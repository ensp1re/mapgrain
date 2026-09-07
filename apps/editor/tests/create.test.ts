import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { JOB_STAGE, JOB_STATUS, REPAIR_ACTION } from "../src/constants/create.ts";
import { EXAMPLES } from "../src/create/examples.ts";
import { importDocumentText } from "../src/create/importDocument.ts";
import { runCreateJob } from "../src/create/job.ts";
import { isProviderConfigured } from "../src/create/provider.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

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
