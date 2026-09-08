import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { BREAKPOINT, PANE_WIDTH } from "../src/constants/layout.ts";

test("layout spec names the 390/768/1024/1280/1440 breakpoints", () => {
  assert.deepEqual(BREAKPOINT, {
    PHONE: 390,
    TABLET: 768,
    LAPTOP: 1024,
    DESKTOP: 1280,
    WIDE: 1440,
  });
  assert.equal(PANE_WIDTH.OUTLINE, 240);
  assert.equal(PANE_WIDTH.INSPECTOR, 304);
});

test("chrome CSS implements the layout spec at each breakpoint", async () => {
  const css = await readFile(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
  assert.match(css, /max-width: 390px/);
  assert.match(css, /max-width: 767px/);
  assert.match(css, /max-width: 1023px/);
  assert.match(css, /max-width: 1279px/);
  assert.match(css, /min-width: 1440px/);
  assert.match(css, /--outline-w: 240px/);
  assert.match(css, /--inspector-w: 304px/);
  assert.match(css, /--outline-w: 280px/);
  assert.match(css, /--inspector-w: 336px/);
  assert.match(css, /\.add-bar/);
  assert.match(css, /\.export-dialog/);
  assert.match(css, /--node-radius/);
});

test("outline, inspector, and export share Pane; library uses Button", async () => {
  const outline = await readFile(fileURLToPath(new URL("../src/chrome/Outline.tsx", import.meta.url)), "utf8");
  const inspector = await readFile(
    fileURLToPath(new URL("../src/chrome/Inspector.tsx", import.meta.url)),
    "utf8",
  );
  const exported = await readFile(
    fileURLToPath(new URL("../src/chrome/ExportDialog.tsx", import.meta.url)),
    "utf8",
  );
  const library = await readFile(fileURLToPath(new URL("../src/chrome/AddBar.tsx", import.meta.url)), "utf8");
  const node = await readFile(
    fileURLToPath(new URL("../src/diagram/ComponentNode.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(outline, /from "\.\.\/ui\/Pane\.tsx"/);
  assert.match(inspector, /from "\.\.\/ui\/Pane\.tsx"/);
  assert.match(exported, /from "\.\.\/ui\/Pane\.tsx"/);
  assert.match(library, /from "\.\.\/ui\/Button\.tsx"/);
  assert.match(library, /aria-label="Library"/);
  assert.match(node, /from "\.\/NodeCard\.tsx"/);
  assert.match(node, /from "\.\/KindLabel\.tsx"/);
});
