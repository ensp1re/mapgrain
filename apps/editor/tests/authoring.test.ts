import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DOCUMENT_KIND, OPERATION_KIND, applyOperation, validateDocument } from "@mapgrain/document";
import { buildScene } from "@mapgrain/scene";
import { blankDocument } from "../src/create/blank.ts";
import { addableKinds, makeNode } from "../src/create/nodes.ts";
import { COMMANDS, COMMAND_ID } from "../src/constants/commands.ts";
import { commandForKeyEvent } from "../src/keyboard/commandShortcut.ts";

const appSource = fileURLToPath(new URL("../src/App.tsx", import.meta.url));

function keyEvent(key: string, extra: Record<string, unknown> = {}) {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    key,
    target: null,
    ...extra,
  };
}

test("a blank document of every kind validates and builds a scene", () => {
  for (const kind of Object.values(DOCUMENT_KIND)) {
    const document = blankDocument(kind);
    const validated = validateDocument(document);
    assert.equal(validated.ok, true, `${kind} ${JSON.stringify(validated)}`);
    assert.equal(buildScene(document).ok, true, `${kind} scene`);
  }
});

test("every kind the Add menu offers can be added to a blank document", () => {
  for (const documentKind of Object.values(DOCUMENT_KIND)) {
    for (const nodeKind of addableKinds(documentKind)) {
      const result = applyOperation(blankDocument(documentKind), {
        kind: OPERATION_KIND.ADD_NODE,
        node: makeNode("nx", nodeKind, nodeKind),
      });
      assert.equal(result.ok, true, `${documentKind}/${nodeKind} ${JSON.stringify(result)}`);
    }
  }
});

test("every advertised single-key shortcut reaches its command", () => {
  for (const command of COMMANDS) {
    const plain = /^[A-Z]$/.exec(command.shortcut);
    if (plain) {
      assert.equal(commandForKeyEvent(keyEvent(command.shortcut.toLowerCase())), command.id, command.label);
      continue;
    }
    if (command.shortcut === "⇧F") {
      assert.equal(commandForKeyEvent(keyEvent("F", { shiftKey: true })), command.id, command.label);
    }
  }
});

test("single-key shortcuts stay out of editable fields, menus, and held keys", () => {
  assert.equal(commandForKeyEvent(keyEvent("n", { target: { tagName: "INPUT" } })), null);
  assert.equal(commandForKeyEvent(keyEvent("n", { repeat: true })), null);
  assert.equal(commandForKeyEvent(keyEvent("a", { shiftKey: true })), null);
  assert.equal(commandForKeyEvent(keyEvent("n", { metaKey: true })), null);
  const insideMenu = { tagName: "BUTTON", closest: (selector: string) => (selector.includes("menu") ? {} : null) };
  assert.equal(commandForKeyEvent(keyEvent("j", { target: insideMenu })), null);
  const onCanvas = { tagName: "DIV", closest: () => null };
  assert.equal(commandForKeyEvent(keyEvent("j", { target: onCanvas })), COMMAND_ID.EXPORT_JSON);
});

test("every command id is dispatched by the editor", async () => {
  const source = await readFile(appSource, "utf8");
  for (const id of Object.values(COMMAND_ID)) {
    const name = Object.entries(COMMAND_ID).find(([, value]) => value === id)?.[0];
    assert.match(source, new RegExp(`COMMAND_ID\\.${name}\\b`), `${name} has no handler`);
  }
});

test("every command id is offered to the user", () => {
  const offered = new Set(COMMANDS.map((command) => command.id));
  for (const id of Object.values(COMMAND_ID)) {
    assert.equal(offered.has(id), true, `${id} is not in COMMANDS`);
  }
});
