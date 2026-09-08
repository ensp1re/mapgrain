import assert from "node:assert/strict";
import test from "node:test";
import { retainSelection, sameIdSet, sameSelection } from "../src/edit/selection.ts";

test("id sets compare membership, not JSON or order", () => {
  assert.equal(sameIdSet(["a", "b"], ["b", "a"]), true);
  assert.equal(sameIdSet(["a"], ["a", "b"]), false);
  assert.equal(sameIdSet([], []), true);
  assert.equal(sameIdSet(["group-1"], ["group-1"]), true);
});

test("retainSelection returns the previous object when ids are unchanged", () => {
  const current = { nodeIds: ["n1", "g1"], edgeIds: [] };
  const next = { nodeIds: ["g1", "n1"], edgeIds: [] };
  assert.equal(retainSelection(current, next), current);
  const empty = { nodeIds: [], edgeIds: [] };
  assert.equal(retainSelection(empty, { nodeIds: [], edgeIds: [] }), empty);
  const changed = retainSelection(current, { nodeIds: ["n2"], edgeIds: [] });
  assert.notEqual(changed, current);
  assert.deepEqual(changed.nodeIds, ["n2"]);
});

test("sameSelection treats empty and group selections as first-class", () => {
  assert.equal(sameSelection({ nodeIds: [], edgeIds: [] }, { nodeIds: [], edgeIds: [] }), true);
  assert.equal(
    sameSelection({ nodeIds: ["runtime"], edgeIds: [] }, { nodeIds: ["runtime"], edgeIds: [] }),
    true,
  );
  assert.equal(
    sameSelection({ nodeIds: ["runtime"], edgeIds: [] }, { nodeIds: ["runtime"], edgeIds: ["e1"] }),
    false,
  );
});
