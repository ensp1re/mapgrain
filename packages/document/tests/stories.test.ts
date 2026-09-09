import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gitVerified, isPinnedGitRevision, PRESET, snapshotMatches, validateDocument } from "../src/index.ts";

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

test("sequence fixture models alt and opt fragments over message orders", async () => {
  const raw = JSON.parse(await readFile(`${fixtures}/sequence-checkout.json`, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.document.fragments?.length, 2);
  assert.equal(result.document.fragments?.[0]?.kind, "alt");
  assert.equal(result.document.fragments?.[1]?.kind, "opt");
});

test("opt fragments need one operand and alt fragments need two", () => {
  const raw = JSON.parse(
    JSON.stringify({
      schemaVersion: 1,
      id: "doc-seq",
      revision: 1,
      kind: "sequence",
      title: "Seq",
      theme: "dark",
      layoutHints: { direction: "down", pinnedNodeIds: [] },
      groups: [],
      views: [{ id: "overview", kind: "overview", name: "All" }],
      nodes: [
        { id: "a", kind: "participant", label: "A", groupId: null, ports: [] },
        { id: "b", kind: "participant", label: "B", groupId: null, ports: [] },
      ],
      edges: [
        {
          id: "m1",
          source: { nodeId: "a" },
          target: { nodeId: "b" },
          type: "message",
          direction: "forward",
          order: 1,
        },
        {
          id: "m2",
          source: { nodeId: "b" },
          target: { nodeId: "a" },
          type: "reply",
          direction: "forward",
          order: 2,
        },
      ],
      fragments: [
        { id: "frag-opt", kind: "opt", operands: [{ label: "[x]", startOrder: 1, endOrder: 1 }] },
      ],
    }),
  ) as unknown;
  assert.equal(validateDocument(raw).ok, true);
  const tooFew = structuredClone(raw) as { fragments: Array<{ kind: string; operands: unknown[] }> };
  tooFew.fragments[0]!.kind = "alt";
  assert.equal(validateDocument(tooFew).ok, false);
});

test("architecture documents reject sequence fragments", async () => {
  const raw = JSON.parse(await readFile(`${fixtures}/nested-groups.json`, "utf8")) as {
    fragments?: unknown;
  };
  raw.fragments = [
    { id: "frag-opt", kind: "opt", operands: [{ label: "[x]", startOrder: 1, endOrder: 1 }] },
  ];
  const result = validateDocument(raw);
  assert.equal(result.ok, false);
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

test("gitVerified requires a pinned commit SHA and a matching blob digest", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  assert.equal(isPinnedGitRevision("main"), false);
  assert.equal(isPinnedGitRevision(sha), true);
  assert.equal(gitVerified({ revision: undefined, snapshot: "abc", gitObjectDigest: "abc" }), false);
  assert.equal(gitVerified({ revision: "main", snapshot: "abc", gitObjectDigest: "abc" }), false);
  assert.equal(gitVerified({ revision: sha, snapshot: "abc", gitObjectDigest: "abc" }), true);
  assert.equal(gitVerified({ revision: sha, snapshot: "abc", gitObjectDigest: "def" }), false);
  assert.equal(gitVerified({ revision: sha, snapshot: "abc", gitObjectDigest: null }), false);
});
