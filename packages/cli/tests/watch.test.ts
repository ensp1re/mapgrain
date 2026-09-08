import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { EXIT_CODE } from "../src/constants/cli.ts";
import { runCli } from "../src/run.ts";
import { storyFrames } from "../src/video.ts";
import { applyWatchTick } from "../src/watch.ts";
import { validateDocument } from "@mapgrain/document";

const fixture = fileURLToPath(new URL("../../../tests/fixtures/documents/sequence-checkout.json", import.meta.url));

test("watch keeps last-good when the next revision is invalid", async () => {
  const good = await readFile(fixture, "utf8");
  const first = applyWatchTick(good, { lastGood: null, lastRaw: null });
  assert.equal(first.ok, true);
  const second = applyWatchTick("{", first.state);
  assert.equal(second.ok, false);
  assert.equal(second.state.lastGood?.id, first.state.lastGood?.id);
});

test("watch --once reloads a valid sequence fixture", async () => {
  const source = await readFile(fixture, "utf8");
  const stdout: string[] = [];
  const io = {
    stdout: { write(chunk: string | Uint8Array) { stdout.push(String(chunk)); } },
    stderr: { write() {} },
    async readFile() { return source; },
    async writeFile() {},
    async exists() { return true; },
  };
  const code = await runCli(["watch", "sequence-checkout.json", "--once", "--format", "html", "-o", "out.html"], io);
  assert.equal(code, EXIT_CODE.OK, stdout.join(""));
});

test("story frames follow the first story steps", async () => {
  const loaded = validateDocument(JSON.parse(await readFile(fixture, "utf8")) as unknown);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  const frames = storyFrames(loaded.document);
  assert.equal(frames.length, 2);
  assert.deepEqual(frames[0]?.nodeIds, ["browser"]);
});
