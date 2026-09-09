import assert from "node:assert/strict";
import test from "node:test";
import { OPERATION_KIND, THEME, applyOperation, validateDocument } from "@mapgrain/document";
import { COMMAND_ID } from "../src/constants/commands.ts";
import { commandAllowed, layoutToken, layoutTokenMatches, selectionFromFlow } from "../src/edit/safety.ts";

const sample = {
  schemaVersion: 1,
  id: "doc-a",
  revision: 2,
  kind: "architecture",
  title: "A",
  theme: "dark",
  layoutHints: { direction: "right", pinnedNodeIds: [] },
  groups: [],
  nodes: [
    {
      id: "n1",
      kind: "service",
      label: "One",
      groupId: null,
      ports: [],
    },
  ],
  edges: [],
  views: [{ id: "overview", kind: "overview", name: "All" }],
  layout: { version: 1, revision: 4, positions: { n1: { x: 10, y: 20 } } },
};

test("stale layout tokens do not match after edit, undo, or opening another document", () => {
  const validated = validateDocument(sample);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const token = layoutToken(validated.document);
  assert.equal(layoutTokenMatches(validated.document, token), true);
  const renamed = applyOperation(validated.document, {
    kind: OPERATION_KIND.SET_NODE_LABEL,
    nodeId: "n1",
    label: "Two",
  });
  assert.equal(renamed.ok, true);
  if (!renamed.ok) return;
  assert.equal(layoutTokenMatches(renamed.document, token), false);
  const other = { ...validated.document, id: "doc-b" };
  assert.equal(layoutTokenMatches(other, token), false);
  const undone = applyOperation(renamed.document, renamed.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(layoutTokenMatches(undone.document, token), false);
});

test("presentation mode blocks mutating commands", () => {
  assert.equal(commandAllowed(true, COMMAND_ID.DELETE), false);
  assert.equal(commandAllowed(true, COMMAND_ID.DUPLICATE), false);
  assert.equal(commandAllowed(true, COMMAND_ID.UNDO), false);
  assert.equal(commandAllowed(true, COMMAND_ID.ARRANGE), false);
  assert.equal(commandAllowed(true, COMMAND_ID.FIT), true);
  assert.equal(commandAllowed(true, COMMAND_ID.PRESENT), true);
  assert.equal(commandAllowed(true, COMMAND_ID.HELP), true);
  assert.equal(commandAllowed(false, COMMAND_ID.DELETE), true);
});

test("flow selection maps to a single editor selection model", () => {
  const selection = selectionFromFlow([{ id: "n1" }, { id: "n2" }], [{ id: "e1" }]);
  assert.deepEqual(selection.nodeIds, ["n1", "n2"]);
  assert.deepEqual(selection.edgeIds, ["e1"]);
});

test("theme is a document property with an inverse", () => {
  const validated = validateDocument(sample);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  const next = applyOperation(validated.document, { kind: OPERATION_KIND.SET_THEME, theme: THEME.LIGHT });
  assert.equal(next.ok, true);
  if (!next.ok) return;
  assert.equal(next.document.theme, THEME.LIGHT);
  const undone = applyOperation(next.document, next.inverse);
  assert.equal(undone.ok, true);
  if (!undone.ok) return;
  assert.equal(undone.document.theme, THEME.DARK);
});
