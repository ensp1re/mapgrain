import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import { STORY_WEBM } from "../src/constants/video.ts";
import { storyExportFrames } from "../src/export/storyFrames.ts";
import {
  encodeStoryWebm,
  STORY_WEBM_CANCELLED,
  STORY_WEBM_NO_RECORDER,
  STORY_WEBM_NO_STORY,
} from "../src/export/webm.ts";

const sequence = fileURLToPath(
  new URL("../../../tests/fixtures/documents/sequence-checkout.json", import.meta.url),
);

test("story export frames follow the first story steps", async () => {
  const raw = JSON.parse(await readFile(sequence, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    storyExportFrames(result.document).map((frame) => frame.id),
    ["step-submit", "step-reserve"],
  );
});

test("encodeStoryWebm rejects an empty story and cancelled recordings", async () => {
  const empty = await encodeStoryWebm([]);
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.message, STORY_WEBM_NO_STORY);

  const controller = new AbortController();
  controller.abort();
  const cancelled = await encodeStoryWebm([new Uint8Array([1])], { signal: controller.signal });
  assert.equal(cancelled.ok, false);
  if (!cancelled.ok) assert.equal(cancelled.message, STORY_WEBM_CANCELLED);
});

test("encodeStoryWebm uses an injected recorder and documents 1280x720 capture", async () => {
  assert.equal(STORY_WEBM.width, 1280);
  assert.equal(STORY_WEBM.height, 720);
  assert.equal(STORY_WEBM.secondsPerStep, 2);
  const recorded = await encodeStoryWebm([new Uint8Array([1, 2]), new Uint8Array([3])], {
    recorder: {
      async record(frames) {
        assert.equal(frames.length, 2);
        return new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
      },
    },
  });
  assert.equal(recorded.ok, true);
  if (recorded.ok) assert.equal(recorded.bytes[0], 0x1a);
});

test("encodeStoryWebm reports missing MediaRecorder without a browser recorder", async () => {
  const result = await encodeStoryWebm([new Uint8Array([1])]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.message, STORY_WEBM_NO_RECORDER);
});
