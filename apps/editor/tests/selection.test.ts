import assert from "node:assert/strict";
import test from "node:test";
import { retainFlowSelection, retainSelection, sameIdSet, sameSelection } from "../src/edit/selection.ts";

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

test("retainFlowSelection ignores empty React Flow echoes", () => {
  const current = { nodeIds: ["n1"], edgeIds: [] };
  assert.equal(retainFlowSelection(current, { nodeIds: [], edgeIds: [] }), current);
  const selected = retainFlowSelection(current, { nodeIds: ["n2"], edgeIds: [] });
  assert.deepEqual(selected, { nodeIds: ["n2"], edgeIds: [] });
  const withEdge = retainFlowSelection(current, { nodeIds: [], edgeIds: ["e1"] });
  assert.deepEqual(withEdge, { nodeIds: [], edgeIds: ["e1"] });
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

test("React Flow's late node echo does not resurrect a card over a selected connection", () => {
  const withEdge = { nodeIds: [], edgeIds: ["e1"] };
  // The outline or a canvas click selected the connection; React Flow still reports the card
  // it had selected a render ago, with no edges of its own.
  assert.equal(retainFlowSelection(withEdge, { nodeIds: ["n1"], edgeIds: [] }), withEdge);
  // Once the connection is genuinely deselected, a card click lands normally.
  assert.deepEqual(retainFlowSelection({ nodeIds: [], edgeIds: [] }, { nodeIds: ["n1"], edgeIds: [] }), {
    nodeIds: ["n1"],
    edgeIds: [],
  });
  // And React Flow may still move the selection to another connection.
  assert.deepEqual(retainFlowSelection(withEdge, { nodeIds: [], edgeIds: ["e2"] }), {
    nodeIds: [],
    edgeIds: ["e2"],
  });
});
