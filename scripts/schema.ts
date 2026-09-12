#!/usr/bin/env node

// The JSON Schema is a build product of the TypeBox schema. It is committed so agents and the
// skill can read it without a checkout, and regenerated here so the two cannot drift.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DiagramDocumentSchema } from "../packages/document/src/schema/document.ts";

const TARGETS = [
  "../packages/document/schema/document.v1.json",
  "../skills/mapgrain/references/document.schema.json",
];

const json = `${JSON.stringify(DiagramDocumentSchema, null, 2)}\n`;
for (const target of TARGETS) {
  const path = fileURLToPath(new URL(target, import.meta.url));
  await writeFile(path, json);
  console.log(path);
}
