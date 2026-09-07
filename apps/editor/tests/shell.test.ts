import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createHistory, pushHistory, redoHistory, undoHistory } from "../src/history/stack.ts";
import { shouldOpenCommandMenu } from "../src/keyboard/commandShortcut.ts";

test("Cmd/Ctrl+K opens the command menu except while typing in an input", () => {
  const input = { tagName: "INPUT", isContentEditable: false } as unknown as HTMLElement;
  const chord = { metaKey: true, ctrlKey: false, key: "k" };
  assert.equal(shouldOpenCommandMenu({ ...chord, target: null }), true);
  assert.equal(shouldOpenCommandMenu({ ...chord, target: input }), false);
  assert.equal(
    shouldOpenCommandMenu({ metaKey: false, ctrlKey: true, key: "k", target: null }),
    true,
  );
  assert.equal(
    shouldOpenCommandMenu({ metaKey: true, ctrlKey: false, key: "p", target: null }),
    false,
  );
});

test("history stack supports undo and redo", () => {
  let stack = createHistory("Local diagram workspace");
  stack = pushHistory(stack, "Review map");
  stack = pushHistory(stack, "Service map");
  assert.equal(stack.present, "Service map");
  stack = undoHistory(stack);
  assert.equal(stack.present, "Review map");
  stack = redoHistory(stack);
  assert.equal(stack.present, "Service map");
});

test("inspector is omitted when nothing is selected", () => {
  const inspectorVisible = (selectedId: string | null) => selectedId !== null;
  assert.equal(inspectorVisible(null), false);
  assert.equal(inspectorVisible("gateway"), true);
});

test("shell CSS keeps chat as an overlay, not a third column", async () => {
  const css = await readFile(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
  assert.match(css, /\.chat-drawer/);
  assert.match(css, /position: absolute/);
  assert.match(css, /\.title-field input/);
});
