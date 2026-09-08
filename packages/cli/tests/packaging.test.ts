import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { requireEditorAssets } from "../src/packaging.ts";

test("packaging rejects a missing or placeholder editor dist", async () => {
  const missing = await mkdtemp(join(tmpdir(), "mapgrain-no-editor-"));
  await assert.rejects(() => requireEditorAssets(missing), /editor assets missing/);
  const stub = await mkdtemp(join(tmpdir(), "mapgrain-stub-editor-"));
  await writeFile(
    join(stub, "index.html"),
    "<!DOCTYPE html><html><head><title>Mapgrain studio</title></head><body><p>Mapgrain studio</p></body></html>\n",
  );
  await assert.rejects(() => requireEditorAssets(stub), /placeholder/);
});
