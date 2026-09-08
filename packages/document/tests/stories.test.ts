import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PRESET, snapshotMatches, validateDocument } from "../src/index.ts";

const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

test("sequence fixture with stories, roles, and a self-message validates", async () => {
  const raw = JSON.parse(await readFile(`${fixtures}/sequence-checkout.json`, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.document.preset, PRESET.COMFORTABLE);
  assert.equal(result.document.nodes[0]?.role, "client");
  assert.equal(result.document.stories?.[0]?.steps.length, 2);
  assert.ok(result.document.edges.some((edge) => edge.source.nodeId === edge.target.nodeId));
});

test("a story step with a missing node is rejected", async () => {
  const raw = JSON.parse(await readFile(`${fixtures}/sequence-checkout.json`, "utf8")) as {
    stories: Array<{ steps: Array<{ nodeId?: string }> }>;
  };
  raw.stories[0]!.steps[0]!.nodeId = "missing";
  const result = validateDocument(raw);
  assert.equal(result.ok, false);
});

test("snapshotMatches does not claim verification from a note", () => {
  assert.equal(snapshotMatches(undefined, "abc"), null);
  assert.equal(snapshotMatches("abc", "abc"), true);
  assert.equal(snapshotMatches("abc", "def"), false);
});
