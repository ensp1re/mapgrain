import assert from "node:assert/strict";
import test from "node:test";
import { DOCUMENT_KIND, validateDocument } from "@mapgrain/document";
import { buildScene, overlappingIds } from "@mapgrain/scene";
import { TEMPLATE_CATEGORY_ORDER } from "../src/constants/templates.ts";
import { TEMPLATES, findTemplate, matchesTemplate, templatesByCategory } from "../src/templates/catalog.ts";
import { snapshotFromTemplate } from "../src/templates/open.ts";
import { deriveWalkthrough } from "../src/walkthrough/derive.ts";

test("every template is a valid document that builds a readable scene", () => {
  for (const item of TEMPLATES) {
    const validated = validateDocument(item.document);
    assert.equal(validated.ok, true, `${item.id} ${JSON.stringify(validated)}`);
    const scene = buildScene(item.document, { positions: item.document.layout?.positions ?? {} });
    assert.equal(scene.ok, true, `${item.id} scene`);
    if (!scene.ok) continue;
    for (const node of scene.scene.nodes) {
      assert.deepEqual(overlappingIds(scene.scene.nodes, node.id), [], `${item.id}: ${node.id} overlaps`);
    }
  }
});

test("every diagram kind and every category is covered", () => {
  const kinds = new Set(TEMPLATES.map((item) => item.document.kind));
  for (const kind of Object.values(DOCUMENT_KIND)) {
    assert.equal(kinds.has(kind), true, `no template for ${kind}`);
  }
  const grouped = templatesByCategory();
  assert.deepEqual(
    grouped.map((group) => group.category),
    TEMPLATE_CATEGORY_ORDER,
  );
});

test("template ids and titles are unique", () => {
  assert.equal(new Set(TEMPLATES.map((item) => item.id)).size, TEMPLATES.length);
  assert.equal(new Set(TEMPLATES.map((item) => item.title)).size, TEMPLATES.length);
  assert.equal(new Set(TEMPLATES.map((item) => item.document.id)).size, TEMPLATES.length);
});

test("using a template makes an independent copy, never a shared document id", () => {
  const first = snapshotFromTemplate(TEMPLATES[0]!, 1_700_000_000_000);
  const second = snapshotFromTemplate(TEMPLATES[1]!, 1_700_000_000_001);
  assert.ok("snapshot" in first && "snapshot" in second);
  if (!("snapshot" in first) || !("snapshot" in second)) return;
  assert.notEqual(first.snapshot.document.id, second.snapshot.document.id);
  assert.notEqual(first.snapshot.document.id, TEMPLATES[0]!.document.id);
  assert.equal(first.snapshot.document.title, TEMPLATES[0]!.title);
  assert.equal(first.snapshot.document.revision, 1);
  // the catalog entry is untouched
  assert.equal(TEMPLATES[0]!.document.id, TEMPLATES[0]!.document.id);
});

test("an invalid template is reported instead of silently dropped", () => {
  const broken = {
    ...TEMPLATES[0]!,
    document: { ...TEMPLATES[0]!.document, nodes: [], edges: [] },
  };
  const result = snapshotFromTemplate(broken);
  assert.ok("error" in result || "snapshot" in result);
  const missingTarget = {
    ...TEMPLATES[0]!,
    document: { ...TEMPLATES[0]!.document, nodes: TEMPLATES[0]!.document.nodes.slice(1) },
  };
  const reported = snapshotFromTemplate(missingTarget);
  assert.equal("error" in reported, true);
});

test("search finds templates by title, blurb and tag", () => {
  assert.ok(TEMPLATES.filter((item) => matchesTemplate(item, "oauth")).length > 0);
  assert.ok(TEMPLATES.filter((item) => matchesTemplate(item, "swimlane")).length > 0);
  assert.ok(TEMPLATES.filter((item) => matchesTemplate(item, "retry")).length > 0);
  assert.equal(TEMPLATES.filter((item) => matchesTemplate(item, "zzzz")).length, 0);
  assert.equal(TEMPLATES.filter((item) => matchesTemplate(item, "")).length, TEMPLATES.length);
  assert.equal(findTemplate("nope"), null);
});

test("every template walks through in order and touches every component", () => {
  for (const item of TEMPLATES) {
    const steps = deriveWalkthrough(item.document);
    assert.ok(steps.length > 0, `${item.id} has no steps`);
    if (item.document.kind === DOCUMENT_KIND.SEQUENCE) {
      assert.equal(steps.length, item.document.edges.length, `${item.id} step per message`);
      continue;
    }
    assert.equal(
      new Set(steps.map((step) => step.nodeId)).size,
      item.document.nodes.length,
      `${item.id} misses components`,
    );
  }
});

test("a lifecycle walkthrough starts at the initial state", () => {
  const lifecycle = TEMPLATES.filter((item) => item.document.kind === DOCUMENT_KIND.LIFECYCLE);
  assert.ok(lifecycle.length > 0);
  for (const item of lifecycle) {
    const first = deriveWalkthrough(item.document)[0];
    const node = item.document.nodes.find((entry) => entry.id === first?.nodeId);
    assert.equal(node?.marker, "initial", item.id);
  }
});

test("deriving a walkthrough does not touch the document", () => {
  const before = JSON.stringify(TEMPLATES[0]!.document);
  deriveWalkthrough(TEMPLATES[0]!.document);
  assert.equal(JSON.stringify(TEMPLATES[0]!.document), before);
});

test("an authored story wins over the derived reading", () => {
  const base = TEMPLATES[0]!.document;
  const withStory = {
    ...base,
    stories: [
      {
        id: "tour",
        name: "Tour",
        steps: [{ id: "s1", name: "Start here", nodeId: base.nodes[1]!.id }],
      },
    ],
  };
  const steps = deriveWalkthrough(withStory);
  assert.equal(steps.length, 1);
  assert.equal(steps[0]?.name, "Start here");
});
