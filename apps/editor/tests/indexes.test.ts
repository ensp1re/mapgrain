import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { indexById } from "../src/edit/indexes.ts";

test("indexById looks up records in constant time by id", () => {
  const edges = [
    { id: "e-read", label: "get" },
    { id: "e-write", label: "set" },
  ];
  const index = indexById(edges);
  assert.equal(index.get("e-write")?.label, "set");
  assert.equal(index.get("missing"), undefined);
});

test("editor edge mapping uses indexed document lookups", async () => {
  const source = await readFile(fileURLToPath(new URL("../src/App.tsx", import.meta.url)), "utf8");
  assert.match(source, /indexById\(documentModel\.edges\)/);
  assert.doesNotMatch(source, /documentModel\.edges\.find\(\(item\) => item\.id === edge\.id\)/);
});
