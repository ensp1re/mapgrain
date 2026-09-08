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
