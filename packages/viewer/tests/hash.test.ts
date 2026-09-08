import assert from "node:assert/strict";
import test from "node:test";
import { REACH_MODE } from "../src/constants/view.ts";
import { knownId, parseViewHash, serializeViewHash } from "../src/hash.ts";

test("view hashes round-trip focus, reach, route, named view, and theme", () => {
  const state = {
    focus: "gateway",
    reach: REACH_MODE.DOWN,
    from: "gateway",
    to: "renderer",
    view: "request-path",
    theme: "light" as const,
  };
  const hash = serializeViewHash(state);
  assert.equal(hash.startsWith("#"), true);
  assert.deepEqual(parseViewHash(hash), state);
  assert.deepEqual(parseViewHash(hash.slice(1)), state);
});

test("off reach and empty fields are omitted; unknown values are ignored", () => {
  assert.equal(serializeViewHash({ reach: REACH_MODE.OFF, focus: "gateway" }), "#focus=gateway");
  assert.equal(serializeViewHash({}), "");
  assert.deepEqual(parseViewHash("#reach=sideways&theme=sepia&focus=gateway"), { focus: "gateway" });
  assert.deepEqual(parseViewHash(""), {});
});

test("knownId drops identifiers that are not in the graph", () => {
  const ids = new Set(["gateway", "document"]);
  assert.equal(knownId("gateway", ids), "gateway");
  assert.equal(knownId("missing", ids), undefined);
  assert.equal(knownId(undefined, ids), undefined);
});
