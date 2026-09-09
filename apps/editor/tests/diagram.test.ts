import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DIAGRAM_FONT_SIZE,
  MIN_READABLE_ZOOM,
  READING_LABEL_SIZE,
  effectiveLabelSize,
  readableFitOptions,
} from "../src/constants/diagram.ts";
import { nextFocusIndex } from "../src/chrome/focusTrap.ts";

test("default fit keeps 14px labels at least 12px after zoom", () => {
  const fit = readableFitOptions();
  assert.equal(DIAGRAM_FONT_SIZE, 14);
  assert.equal(READING_LABEL_SIZE, 12);
  assert.equal(fit.minZoom, MIN_READABLE_ZOOM);
  assert.ok(effectiveLabelSize(DIAGRAM_FONT_SIZE, fit.minZoom) >= READING_LABEL_SIZE);
  assert.ok(effectiveLabelSize(DIAGRAM_FONT_SIZE, 1) >= READING_LABEL_SIZE);
});

test("focus trap cycles from last to first and first to last", () => {
  assert.equal(nextFocusIndex(2, 3, false), 0);
  assert.equal(nextFocusIndex(0, 3, true), 2);
  assert.equal(nextFocusIndex(1, 3, false), 2);
  assert.equal(nextFocusIndex(0, 0, false), 0);
});

test("editor canvas shows zoom percentage and uses a readable fit", async () => {
  const app = await readFile(fileURLToPath(new URL("../src/App.tsx", import.meta.url)), "utf8");
  const css = await readFile(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
  assert.match(app, /fitAllOptions/);
  assert.match(app, /ViewportBar/);
  assert.match(css, /\.zoom-readout/);
  assert.match(css, /\.viewport-bar/);
  assert.match(css, /font-size: 14px/);
  assert.match(css, /\.node-title \{[\s\S]*--node-title-size, 14px/);
});

test("more menu and select lists portal outside clipped ancestors", async () => {
  const overlay = await readFile(fileURLToPath(new URL("../src/ui/Overlay.tsx", import.meta.url)), "utf8");
  const topBar = await readFile(fileURLToPath(new URL("../src/chrome/TopBar.tsx", import.meta.url)), "utf8");
  const select = await readFile(fileURLToPath(new URL("../src/ui/Select.tsx", import.meta.url)), "utf8");
  assert.match(overlay, /createPortal/);
  assert.match(overlay, /document\.body/);
  assert.match(topBar, /<Overlay/);
  assert.match(select, /<Overlay/);
});

test("command, export, connect, and add surfaces trap focus", async () => {
  const files = ["CommandMenu.tsx", "ExportDialog.tsx", "ConnectDialog.tsx", "AddBar.tsx"];
  for (const name of files) {
    const source = await readFile(fileURLToPath(new URL(`../src/chrome/${name}`, import.meta.url)), "utf8");
    assert.match(source, /useFocusTrap/, name);
  }
});

test("editor nodes activate on Enter and Space", async () => {
  const node = await readFile(
    fileURLToPath(new URL("../src/diagram/ComponentNode.tsx", import.meta.url)),
    "utf8",
  );
  const card = await readFile(fileURLToPath(new URL("../src/diagram/NodeCard.tsx", import.meta.url)), "utf8");
  assert.match(card, /tabIndex=\{0\}/);
  assert.match(node, /event\.key === "Enter" \|\| event\.key === " "/);
});
