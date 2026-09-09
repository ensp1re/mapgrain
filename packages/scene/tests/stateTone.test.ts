import assert from "node:assert/strict";
import test from "node:test";
import { NODE_MARKER } from "@mapgrain/document";
import { STATE_TONE, stateTone } from "../src/index.ts";

test("state tone uses fail and wait words before markers", () => {
  assert.equal(stateTone("Failed", NODE_MARKER.FINAL), STATE_TONE.FAIL);
  assert.equal(stateTone("pending", NODE_MARKER.INITIAL), STATE_TONE.WAIT);
  assert.equal(stateTone("Idle", NODE_MARKER.INITIAL), STATE_TONE.START);
  assert.equal(stateTone("Closed", NODE_MARKER.FINAL), STATE_TONE.DONE);
  assert.equal(stateTone("Active"), STATE_TONE.ACTIVE);
});
