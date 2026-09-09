import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DOCUMENT_KIND, validateDocument } from "../src/index.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const diagramsDir = path.join(root, "docs/audit/diagrams");
const ledgerPath = path.join(root, "docs/audit/2026-09-10-enspire-crm.md");

test("the Enspire CRM audit ledger names five kinds, findings, and screenshots", async () => {
  const text = await readFile(ledgerPath, "utf8");
  assert.match(text, /# Mapgrain 0\.2\.1 audit — Enspire CRM/);
  assert.match(text, /## Findings/);
  assert.match(text, /## Per-kind journeys/);
  assert.match(text, /## CLI/);
  assert.match(text, /## Skill live run/);
  assert.match(text, /## Security/);
  assert.match(text, /## Competitive kinds/);
  assert.match(text, /A-001/);
  assert.match(text, /npx mapgrain@0\.2\.1/);
  assert.doesNotMatch(text, /npx mapgrain@latest/);
  for (const kind of Object.values(DOCUMENT_KIND)) {
    assert.match(text, new RegExp(kind.replace("-", "\\-")), kind);
  }
  assert.match(text, /docs\/audit\/media\/cli-architecture\.png/);
  assert.match(text, /docs\/audit\/media\/architecture-1440\.png/);
});

test("Enspire CRM audit diagrams validate one document per kind", async () => {
  const names = (await readdir(diagramsDir)).filter((name) => name.endsWith(".json")).sort();
  assert.deepEqual(names, [
    "enspire-architecture.json",
    "enspire-data-flow.json",
    "enspire-lifecycle.json",
    "enspire-sequence.json",
    "enspire-workflow.json",
  ]);
  const kinds = new Set<string>();
  for (const name of names) {
    const raw = JSON.parse(await readFile(path.join(diagramsDir, name), "utf8")) as unknown;
    const result = validateDocument(raw);
    assert.equal(result.ok, true, `${name} ${JSON.stringify(result)}`);
    if (!result.ok) continue;
    kinds.add(result.document.kind);
    assert.equal(result.document.evidence?.some((item) => item.state === "observed"), true, name);
  }
  assert.deepEqual([...kinds].sort(), [...Object.values(DOCUMENT_KIND)].sort());
});
