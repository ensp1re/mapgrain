import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("inspector, connect, and export use the custom Select, not a native select", async () => {
  const files = ["Inspector.tsx", "ConnectDialog.tsx", "ExportDialog.tsx"].map((name) =>
    fileURLToPath(new URL(`../src/chrome/${name}`, import.meta.url)),
  );
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.match(source, /from "\.\.\/ui\/Select\.tsx"/);
    assert.doesNotMatch(source, /<select[\s>]/);
  }
});

test("outline, inspector, toolbar, and export have no native unstyled select", async () => {
  const files = ["Outline.tsx", "Inspector.tsx", "TopBar.tsx", "ExportDialog.tsx", "AddBar.tsx"].map((name) =>
    fileURLToPath(new URL(`../src/chrome/${name}`, import.meta.url)),
  );
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /<select[\s>]/);
  }
});

test("export dialog offers PNG scale without a native select", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../src/chrome/ExportDialog.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(source, /PNG scale/);
  assert.match(source, /PNG_SCALE_OPTIONS/);
});
