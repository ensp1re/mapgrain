import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  OPERATION_KIND,
  applyOperation,
  validateDocument,
} from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { ALIGN_KIND } from "../src/constants/align.ts";
import { alignPositions } from "../src/geometry/align.ts";
import { positionsFromScene } from "../src/geometry/positions.ts";
import { createHistory, pushHistory, undoHistory } from "../src/history/stack.ts";
import {
  isDeleteEvent,
  isDuplicateEvent,
  isRedoEvent,
  isUndoEvent,
} from "../src/keyboard/editShortcut.ts";
import type { EditorSnapshot } from "../src/types/editor.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

async function load() {
  const raw = JSON.parse(await readFile(fixture, "utf8")) as unknown;
  const result = validateDocument(raw);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture invalid");
  return result.document;
}

test("label change with stored positions does not move other nodes", async () => {
  const document = await load();
  const first = buildScene(document);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const positions = positionsFromScene(first.scene.nodes);
  const others = first.scene.nodes
    .filter((node) => node.id !== "gateway")
    .map((node) => ({ id: node.id, x: node.rect.x, y: node.rect.y }));
  const edited = applyOperation(document, {
    kind: OPERATION_KIND.SET_NODE_LABEL,
    nodeId: "gateway",
    label: "Workspace API with a much longer name",
  });
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  const kept = buildScene(edited.document, { positions });
  assert.equal(kept.ok, true);
  if (!kept.ok) return;
  for (const other of others) {
    const node = kept.scene.nodes.find((item) => item.id === other.id);
    assert.equal(node?.rect.x, other.x);
    assert.equal(node?.rect.y, other.y);
  }
  const naive = buildScene(edited.document);
  assert.equal(naive.ok, true);
  if (!naive.ok) return;
  const naiveDocument = naive.scene.nodes.find((node) => node.id === "document");
  const firstDocument = first.scene.nodes.find((node) => node.id === "document");
  assert.notEqual(naiveDocument?.rect.x, firstDocument?.rect.x);
});

test("document snapshot undo restores the previous document", async () => {
  const document = await load();
  const first = buildScene(document);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  let stack = createHistory<EditorSnapshot>({
    document,
    positions: positionsFromScene(first.scene.nodes),
  });
  const edited = applyOperation(document, {
    kind: OPERATION_KIND.SET_NODE_LABEL,
    nodeId: "gateway",
    label: "Workspace API v2",
  });
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  stack = pushHistory(stack, { document: edited.document, positions: stack.present.positions });
  stack = undoHistory(stack);
  assert.equal(stack.present.document.nodes.find((node) => node.id === "gateway")?.label, "Workspace API");
});

test("align left shares the minimum x among selected nodes", () => {
  const next = alignPositions(
    { a: { x: 40, y: 10 }, b: { x: 12, y: 80 } },
    ["a", "b"],
    { a: { width: 10, height: 10 }, b: { width: 10, height: 10 } },
    ALIGN_KIND.LEFT,
  );
  assert.equal(next.a?.x, 12);
  assert.equal(next.b?.x, 12);
  assert.equal(next.a?.y, 10);
  assert.equal(next.b?.y, 80);
});

test("edit shortcuts ignore typing in an input", () => {
  const input = { tagName: "INPUT", isContentEditable: false } as unknown as HTMLElement;
  const chord = { metaKey: true, ctrlKey: false, shiftKey: false, key: "z", target: input };
  assert.equal(isUndoEvent(chord), false);
  assert.equal(isRedoEvent({ ...chord, shiftKey: true }), false);
  assert.equal(isDuplicateEvent({ ...chord, key: "d" }), false);
  assert.equal(isDeleteEvent({ key: "Backspace", target: input }), false);
  assert.equal(isUndoEvent({ ...chord, target: null }), true);
  assert.equal(isDeleteEvent({ key: "Backspace", target: null }), true);
});
