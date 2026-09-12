import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BREAKPOINT,
  PANE_WIDTH,
  PANE_WIDTH_MAX,
  PANE_WIDTH_MIN,
  SHELL_LAYOUT,
} from "../src/constants/layout.ts";
import { shellLayoutForWidth } from "../src/chrome/viewport.ts";

test("layout spec names the 390/768/1024/1280/1440 breakpoints", () => {
  assert.deepEqual(BREAKPOINT, {
    PHONE: 390,
    TABLET: 768,
    LAPTOP: 1024,
    DESKTOP: 1280,
    WIDE: 1440,
  });
  assert.equal(PANE_WIDTH.OUTLINE, 264);
  assert.equal(PANE_WIDTH.INSPECTOR, 300);
  assert.equal(PANE_WIDTH.OUTLINE_LAPTOP, 220);
});

test("shell layout is split at 1280, one panel at 768, overlay below", () => {
  assert.equal(shellLayoutForWidth(1440), SHELL_LAYOUT.SPLIT);
  assert.equal(shellLayoutForWidth(1280), SHELL_LAYOUT.SPLIT);
  assert.equal(shellLayoutForWidth(1024), SHELL_LAYOUT.SINGLE);
  assert.equal(shellLayoutForWidth(768), SHELL_LAYOUT.SINGLE);
  assert.equal(shellLayoutForWidth(767), SHELL_LAYOUT.OVERLAY);
  assert.equal(shellLayoutForWidth(390), SHELL_LAYOUT.OVERLAY);
});

test("chrome CSS implements the layout spec at each breakpoint", async () => {
  const css = await readFile(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
  const tokens = await readFile(fileURLToPath(new URL("../src/styles/tokens.css", import.meta.url)), "utf8");
  assert.match(css, /max-width: 390px/);
  assert.match(css, /max-width: 767px/);
  assert.match(css, /max-width: 1023px/);
  assert.match(css, /max-width: 1279px/);
  assert.match(tokens, new RegExp(`--outline-w: ${PANE_WIDTH.OUTLINE}px`));
  assert.match(tokens, new RegExp(`--inspector-w: ${PANE_WIDTH.INSPECTOR}px`));
  assert.match(css, new RegExp(`--outline-w: ${PANE_WIDTH.OUTLINE_LAPTOP}px`));
  assert.match(tokens, /--topbar-h: 52px/);
  assert.match(css, /\.text-btn\.ghost/);
  assert.match(css, /\.canvas-status/);
  assert.match(css, /\.outline-search/);
  assert.match(css, /grid-template-rows: 1fr/);
  assert.match(css, /\.add-bar/);
  assert.match(css, /\.export-dialog/);
  assert.match(tokens, /--node-radius/);
  assert.match(tokens, /--space-4: 16px/);
});

test("panes are resizable between a floor and a ceiling, and the shell grid respects them", async () => {
  const css = await readFile(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
  assert.ok(PANE_WIDTH_MIN < PANE_WIDTH.OUTLINE && PANE_WIDTH.INSPECTOR < PANE_WIDTH_MAX);
  assert.match(css, /minmax\(var\(--outline-w-min\), var\(--outline-w\)\)/);
  assert.match(css, /\.pane-resizer/);
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
  const group = await readFile(fileURLToPath(new URL("../src/diagram/GroupNode.tsx", import.meta.url)), "utf8");
  const app = await readFile(fileURLToPath(new URL("../src/App.tsx", import.meta.url)), "utf8");
  assert.match(outline, /from "\.\.\/ui\/Pane\.tsx"/);
  assert.match(outline, /placeholder="Search components"/);
  assert.match(outline, /meta=\{count\}/);
  assert.match(inspector, /from "\.\.\/ui\/Pane\.tsx"/);
  assert.match(exported, /from "\.\.\/ui\/Pane\.tsx"/);
  assert.match(library, /from "\.\.\/ui\/Button\.tsx"/);
  assert.match(library, /aria-label="Library"/);
  assert.match(library, /aria-label="Add"/);
  assert.match(library, /Add component/);
  assert.match(library, /<Overlay/);
  assert.doesNotMatch(library, /Add service/);
  assert.match(node, /from "\.\/NodeCard\.tsx"/);
  assert.match(node, /dataShape=\{node\.shape\}/);
  assert.match(node, /from "\.\/KindLabel\.tsx"/);
  assert.match(app, /KindLegend/);
  assert.match(group, /data-lane/);
  assert.match(group, /is-lane/);
  assert.match(node, /asSource/);
  assert.doesNotMatch(node, /port\.side === PORT_SIDE\.WEST \|\| port\.side === PORT_SIDE\.NORTH \? "target"/);
  assert.match(outline, /outline-chevron/);
  assert.match(outline, /KindIcon/);
});
