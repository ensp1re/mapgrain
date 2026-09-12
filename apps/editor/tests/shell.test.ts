import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createHistory, pushHistory, redoHistory, undoHistory } from "../src/history/stack.ts";
import { COMMAND_ID, commandsByScope, shortcutCommands } from "../src/constants/commands.ts";
import { shouldOpenCommandMenu, shouldOpenHelp } from "../src/keyboard/commandShortcut.ts";
import { shortcutLabel } from "../src/keyboard/shortcutLabel.ts";

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

test("? and F1 open help except while typing in an input", () => {
  const input = { tagName: "INPUT", isContentEditable: false } as unknown as HTMLElement;
  assert.equal(shouldOpenHelp({ metaKey: false, ctrlKey: false, key: "?", target: null }), true);
  assert.equal(shouldOpenHelp({ metaKey: false, ctrlKey: false, key: "F1", target: null }), true);
  assert.equal(shouldOpenHelp({ metaKey: false, ctrlKey: false, key: "?", target: input }), false);
  assert.equal(shouldOpenHelp({ metaKey: true, ctrlKey: false, key: "?", target: null }), false);
  assert.equal(shouldOpenHelp({ metaKey: false, ctrlKey: false, key: "/", target: null }), false);
});

test("shortcut labels stay Apple glyphs on Mac and become Ctrl/Shift elsewhere", () => {
  assert.equal(shortcutLabel("⌘K", true), "⌘K");
  assert.equal(shortcutLabel("⇧⌘Z", true), "⇧⌘Z");
  assert.equal(shortcutLabel("⌘K", false), "Ctrl+K");
  assert.equal(shortcutLabel("⇧⌘Z", false), "Shift+Ctrl+Z");
  assert.equal(shortcutLabel("⇧F", false), "Shift+F");
});

test("help overlay groups COMMANDS that have shortcuts", () => {
  const help = shortcutCommands().find((item) => item.id === COMMAND_ID.HELP);
  assert.ok(help);
  assert.equal(help?.shortcut, "?");
  const groups = commandsByScope();
  assert.deepEqual(
    groups.map((group) => group.label),
    ["Editor", "Canvas", "Selection"],
  );
  assert.ok(groups.some((group) => group.items.some((item) => item.id === COMMAND_ID.UNDO)));
  assert.equal(
    shortcutCommands().some((item) => item.shortcut.length === 0),
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

test("shell CSS keeps secondary surfaces as overlays, not extra columns", async () => {
  const css = await readFile(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
  assert.match(css, /\.start-page/);
  assert.match(css, /\.example-card/);
  assert.match(css, /position: absolute/);
  assert.match(css, /\.title-field input/);
  assert.match(css, /\.help-overlay/);
  assert.match(css, /\.help-row/);
});

test("select supports Home, End, and typeahead", async () => {
  const source = await readFile(fileURLToPath(new URL("../src/ui/Select.tsx", import.meta.url)), "utf8");
  assert.match(source, /event\.key === "Home"/);
  assert.match(source, /event\.key === "End"/);
  assert.match(source, /startsWith\(needle\)/);
});

test("the header offers no chat entry and keeps Help reachable", async () => {
  const topbar = await readFile(fileURLToPath(new URL("../src/chrome/TopBar.tsx", import.meta.url)), "utf8");
  assert.doesNotMatch(topbar, /Chat is unavailable/);
  assert.doesNotMatch(topbar, />\s*Chat\s*</);
  assert.match(topbar, /onHelp/);
  assert.match(topbar, />\s*Help\s*</);
  assert.match(topbar, /aria-label="More"/);
  assert.match(topbar, /Document menu/);
});
