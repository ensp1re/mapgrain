import assert from "node:assert/strict";
import test from "node:test";
import { NODE_KIND } from "@mapgrain/document";
import { kindShort } from "../src/constants/kind.ts";

test("outline kind chips stay short enough for the pane", () => {
  assert.equal(kindShort(NODE_KIND.PARTICIPANT), "P");
  assert.equal(kindShort(NODE_KIND.STATE), "ST");
  assert.equal(kindShort(NODE_KIND.DATASTORE), "DS");
  assert.ok(kindShort(NODE_KIND.PARTICIPANT).length <= 3);
});
