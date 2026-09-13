import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DOCUMENT_KIND,
  EDGES_FOR_KIND,
  NODES_FOR_KIND,
  OPERATION_KIND,
  applyOperationAt,
  validateDocument,
} from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { renderView } from "@mapgrain/viewer";
import { PUBLISHED_CLI, SOURCE_CLI_VERSION } from "../src/constants/agents.ts";

const skillDir = fileURLToPath(new URL("../../../skills/mapgrain", import.meta.url));
const example = path.join(skillDir, "examples", "ten-node.json");
const branching = path.join(skillDir, "examples", "branching.json");
const schema = path.join(skillDir, "references", "document.schema.json");

test("the skill directory ships schema, examples, and local runtime instructions", async () => {
  const text = await readFile(path.join(skillDir, "SKILL.md"), "utf8");
  assert.match(text, /^---\nname: mapgrain\n/m);
  assert.match(text, /--agent cursor/);
  assert.match(text, /--agent codex/);
  assert.match(text, /--agent claude-code/);
  assert.match(text, /--agent opencode/);
  assert.match(text, /--agent github-copilot/);
  assert.match(text, /--agent grok/);
  assert.match(text, /--agent gemini-cli/);
  assert.match(text, /--agent windsurf/);
  assert.doesNotMatch(text, /copilot-codex/);
  assert.match(text, new RegExp(`npx ${PUBLISHED_CLI} validate`));
  assert.match(text, new RegExp(`npx ${PUBLISHED_CLI} layout`));
  assert.match(text, /pnpm mapgrain layout/);
  assert.match(text, /sequence, data-flow, or lifecycle/);
  assert.match(text, new RegExp(SOURCE_CLI_VERSION.replaceAll('.', '\\.')));
  assert.match(text, /npx mapgrain@0\.1\.0/);
  assert.doesNotMatch(text, /npx mapgrain@latest/);
  assert.match(text, /From a Mapgrain checkout only/);
  assert.match(text, /references\/document\.schema\.json/);
  assert.match(text, /Do not invent pixel positions/);
  assert.match(text, /Do not execute the repository/);
  assert.match(text, /One writer per artifact/);
  const schemaRaw = JSON.parse(await readFile(schema, "utf8")) as { $id?: string };
  assert.match(String(schemaRaw.$id ?? ""), /document/);
  const names = await readdir(path.join(skillDir, "examples"));
  assert.ok(names.includes("ten-node.json"));
  assert.ok(names.includes("branching.json"));
});

test("copying the skill into empty agent project folders keeps schema and examples", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mapgrain-skill-"));
  for (const dest of [path.join(root, ".agents", "skills", "mapgrain"), path.join(root, ".claude", "skills", "mapgrain")]) {
    await mkdir(dest, { recursive: true });
    await cp(skillDir, dest, { recursive: true });
    const installed = await readFile(path.join(dest, "SKILL.md"), "utf8");
    assert.match(installed, /name: mapgrain/);
    await readFile(path.join(dest, "references", "document.schema.json"), "utf8");
    await readFile(path.join(dest, "examples", "branching.json"), "utf8");
  }
});

test("the ten-node example validates, keeps evidence, and exports HTML", async () => {
  const raw = JSON.parse(await readFile(example, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.document.nodes.length, 10);
  assert.equal(result.document.id, "doc-invoice-lane");
  assert.ok(result.document.layout?.positions.capture);
  assert.equal(result.document.evidence?.[0]?.state, "observed");
  const html = renderView(result.document);
  assert.equal(html.ok, true);
  if (!html.ok) return;
  assert.match(html.html, /Invoice capture lane/);
  assert.match(html.html, /Read-only view/);
});

test("a label edit keeps ids and portable layout when the base revision matches", async () => {
  const raw = JSON.parse(await readFile(example, "utf8")) as unknown;
  const loaded = validateDocument(raw);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const before = loaded.document.layout?.positions.capture;
  const edited = applyOperationAt(
    loaded.document,
    { kind: OPERATION_KIND.SET_NODE_LABEL, nodeId: "ocr", label: "OCR worker" },
    loaded.document.revision,
  );
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.equal(edited.document.nodes.find((node) => node.id === "ocr")?.label, "OCR worker");
  assert.equal(edited.document.nodes.length, 10);
  assert.deepEqual(edited.document.layout?.positions.capture, before);
  assert.equal(edited.document.layout?.positions.clerk?.x, loaded.document.layout?.positions.clerk?.x);
});

test("the branching example has 8-12 nodes and no authored coordinates", async () => {
  const raw = JSON.parse(await readFile(branching, "utf8")) as { layout?: unknown; nodes: unknown[] };
  assert.equal(raw.layout, undefined);
  const result = validateDocument(raw);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.ok(result.document.nodes.length >= 8);
  assert.ok(result.document.nodes.length <= 12);
});

test("the skill ships a worked example of every diagram kind, and each one works", async () => {
  const names = (await readdir(path.join(skillDir, "examples"))).filter((name) =>
    name.endsWith(".json"),
  );
  const kinds = new Set<string>();
  for (const name of names) {
    const raw = JSON.parse(await readFile(path.join(skillDir, "examples", name), "utf8")) as unknown;
    const result = validateDocument(raw);
    assert.equal(result.ok, true, `${name}: ${JSON.stringify(result)}`);
    if (!result.ok) continue;
    kinds.add(result.document.kind);
    // An example an agent copies has to lay out and export, not merely validate.
    const scene = buildScene(result.document, {
      positions: result.document.layout?.positions ?? {},
    });
    assert.equal(scene.ok, true, `${name} built no scene`);
    const html = renderView(result.document);
    assert.equal(html.ok, true, `${name} exported no HTML`);
  }
  for (const kind of Object.values(DOCUMENT_KIND)) {
    assert.ok(kinds.has(kind), `the skill ships no ${kind} example`);
  }
});

test("the schema reference names every kind's vocabulary, and invents none", async () => {
  const text = await readFile(path.join(skillDir, "references", "schema.md"), "utf8");
  for (const kind of Object.values(DOCUMENT_KIND)) {
    assert.match(text, new RegExp(`\`${kind}\``), `schema.md never mentions ${kind}`);
    for (const nodeKind of NODES_FOR_KIND[kind]) {
      assert.match(text, new RegExp(`\`${nodeKind}\``), `${kind} node kind ${nodeKind} is undocumented`);
    }
    for (const edgeType of EDGES_FOR_KIND[kind]) {
      assert.match(
        text,
        new RegExp(`\`${edgeType}\``),
        `${kind} edge type ${edgeType} is undocumented`,
      );
    }
  }
  // The old reference claimed architecture and workflow were the only kinds.
  assert.doesNotMatch(text, /`architecture` \| `workflow`\)/);
  for (const name of ["workflow.json", "sequence.json", "data-flow.json", "lifecycle.json"]) {
    assert.match(text, new RegExp(name.replace(".", "\\.")), `schema.md links no ${name}`);
  }
});
