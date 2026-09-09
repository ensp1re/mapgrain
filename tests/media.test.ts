import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

async function text(relative: string): Promise<string> {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

test("production media files stay within documented size limits", async () => {
  const limits: Record<string, number> = {
    "docs/media/hero-dark.png": 500 * 1024,
    "docs/media/hero-light.png": 500 * 1024,
    "docs/media/narrow-390.png": 500 * 1024,
    "docs/media/cli-receipts.png": 500 * 1024,
    "docs/media/editing.gif": 5 * 1024 * 1024,
    "docs/media/viewer.gif": 5 * 1024 * 1024,
    "docs/media/cli-workflow.gif": 5 * 1024 * 1024,
  };
  for (const [relative, max] of Object.entries(limits)) {
    const info = await stat(`${root}/${relative}`);
    assert.ok(info.size > 2_000, `${relative} is empty`);
    assert.ok(info.size <= max, `${relative} is ${info.size} bytes, limit ${max}`);
  }
});

test("capture manifest records commit, fixture, viewport, and theme", async () => {
  const manifest = JSON.parse(await text("../docs/media/capture.json")) as {
    commit?: string;
    fixture?: string;
    buildCommand?: string;
    artifacts?: Array<{ file: string; viewport?: { width: number; height: number }; theme?: string }>;
  };
  assert.match(manifest.commit ?? "", /^[0-9a-f]{40}$/);
  assert.equal(manifest.fixture, "skills/mapgrain/examples/ten-node.json");
  assert.match(manifest.buildCommand ?? "", /@mapgrain\/editor build/);
  const files = new Set((manifest.artifacts ?? []).map((item) => item.file));
  assert.ok(files.has("docs/media/hero-dark.png"));
  assert.ok(files.has("docs/media/editing.gif"));
  assert.ok(files.has("docs/media/viewer.gif"));
  const hero = (manifest.artifacts ?? []).find((item) => item.file === "docs/media/hero-dark.png");
  assert.deepEqual(hero?.viewport, { width: 1440, height: 900 });
  assert.equal(hero?.theme, "dark");
});

test("README links production media, the feature table, and getting-started", async () => {
  const readme = await text("../README.md");
  for (const needle of [
    "docs/media/hero-dark.png",
    "docs/media/hero-light.png",
    "docs/media/editing.gif",
    "docs/media/viewer.gif",
    "docs/media/cli-workflow.gif",
    "docs/media/narrow-390.png",
    "docs/FEATURES.md",
    "docs/getting-started.md",
    "docs/agents.md",
    "npx mapgrain@0.2.1",
  ]) {
    assert.match(readme, new RegExp(needle.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(readme, /universal agent/i);
  assert.doesNotMatch(readme, /perfect quality/i);
});
