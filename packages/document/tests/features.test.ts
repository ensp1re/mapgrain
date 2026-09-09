import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("the public feature table distinguishes shipped, partial, planned, and deferred", async () => {
  const text = await readFile(fileURLToPath(new URL("../../../docs/FEATURES.md", import.meta.url)), "utf8");
  assert.match(text, /\| Feature \| Status \|/);
  assert.match(text, /Sequence diagrams \| shipped/);
  assert.match(text, /alt\/opt fragments/);
  assert.match(text, /Data-flow diagrams \| shipped/);
  assert.match(text, /Lifecycle diagrams \| shipped/);
  assert.match(text, /Geometry diagnostics \| shipped/);
  assert.match(text, /Stories and role lenses \| shipped/);
  assert.match(text, /Watch\/reload last-good agent file \| shipped/);
  assert.match(text, /Pinned Git evidence \| shipped/);
  assert.match(text, /Browser story WebM \| shipped/);
  assert.match(text, /Keyboard shortcut help \| shipped/);
  assert.match(text, /Help overlay lists COMMANDS/);
  for (const relative of [
    "docs/FEATURES.md",
    "docs/CAPABILITY.md",
    "docs/PLAN.md",
    "docs/handoff.json",
    "README.md",
  ]) {
    const body = await readFile(fileURLToPath(new URL(`../../../${relative}`, import.meta.url)), "utf8");
    assert.doesNotMatch(body, /Five-user study \/ device smoke/, relative);
    assert.doesNotMatch(body, /physical-device smoke/, relative);
  }
});
