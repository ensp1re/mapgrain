import assert from "node:assert/strict";
import test from "node:test";
import { applySelectChanges, retainSelection, sameIdSet, sameSelection } from "../src/edit/selection.ts";

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

test("a select change folds into the editor's selection, one kind at a time", () => {
  const empty = { nodeIds: [], edgeIds: [] };
  assert.deepEqual(applySelectChanges(empty, [{ id: "n1", selected: true }], "node"), {
    nodeIds: ["n1"],
    edgeIds: [],
  });
  // Picking a connection drops the card, and picking a card drops the connection: the
  // inspector shows one thing.
  const card = { nodeIds: ["n1"], edgeIds: [] };
  assert.deepEqual(applySelectChanges(card, [{ id: "e1", selected: true }], "edge"), {
    nodeIds: [],
    edgeIds: ["e1"],
  });
  const link = { nodeIds: [], edgeIds: ["e1"] };
  assert.deepEqual(applySelectChanges(link, [{ id: "n2", selected: true }], "node"), {
    nodeIds: ["n2"],
    edgeIds: [],
  });
  // Deselecting the last of one kind leaves the other kind alone, so a stale echo cannot
  // wipe a selection this component just made.
  const both = { nodeIds: [], edgeIds: ["e1"] };
  assert.deepEqual(applySelectChanges(both, [{ id: "n9", selected: false }], "node"), both);
  // Several nodes select together, as a box selection does.
  assert.deepEqual(
    applySelectChanges(empty, [{ id: "a", selected: true }, { id: "b", selected: true }], "node"),
    { nodeIds: ["a", "b"], edgeIds: [] },
  );
  // No change is no new object.
  assert.equal(applySelectChanges(card, [{ id: "n1", selected: true }], "node"), card);
  assert.equal(applySelectChanges(card, [], "node"), card);
});
