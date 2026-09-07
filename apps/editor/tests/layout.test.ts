import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const engineSource = fileURLToPath(new URL("../src/layout/browserEngine.ts", import.meta.url));

test("browser ELK is loaded on first arrange, not at module evaluation", async () => {
  const source = await readFile(engineSource, "utf8");
  assert.match(source, /import\("elkjs\/lib\/elk-api\.js"\)/);
  assert.match(source, /import\("elkjs\/lib\/elk-worker\.js\?worker"\)/);
  assert.doesNotMatch(source, /^import ELK from "elkjs\/lib\/elk-api\.js";/m);
});
