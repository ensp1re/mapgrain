import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { waitStartOrEditor } from "./helpers.ts";

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
};

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

async function listen(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void (async () => {
      const pathName = req.url?.split("?")[0] === "/" ? "/index.html" : (req.url?.split("?")[0] ?? "/index.html");
      const file = join(dist, pathName.replace(/^\/+/, ""));
      try {
        const bytes = await readFile(file);
        res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
        res.end(bytes);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    })();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server address missing");
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

test("editor chrome stays in bounds at 1440, 1280, 1024, 768, and 390", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    const start = page.getByRole("button", { name: "New architecture" });
    await waitStartOrEditor(page);
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      await page.getByRole("button", { name: "Export" }).waitFor({ timeout: 10_000 });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${viewport.width}x${viewport.height} overflow ${overflow}`);
    await page.getByRole("button", { name: "Add", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Add service" }).count(), 0);
    const more = page.getByRole("button", { name: "More" });
    if (viewport.width <= 390) {
      await more.click();
      const arrangeItem = page.getByRole("menuitem", { name: "Arrange" });
      await arrangeItem.waitFor();
      const arrangeItemBox = await arrangeItem.boundingBox();
      assert.ok(arrangeItemBox && arrangeItemBox.width > 8 && arrangeItemBox.height > 8, `${viewport.width} Arrange not hittable`);
      const undo = page.getByRole("menuitem", { name: "Undo" }).first();
      await undo.waitFor();
      const undoBox = await undo.boundingBox();
      assert.ok(undoBox && undoBox.height > 8, `${viewport.width} More menu clipped`);
      await page.getByRole("menuitem", { name: "Help" }).waitFor();
      await page.keyboard.press("Escape");
    } else {
      const arrangeBox = await page.getByRole("button", { name: "Arrange" }).boundingBox();
      assert.ok(arrangeBox && arrangeBox.width > 8 && arrangeBox.height > 8, `${viewport.width} Arrange not hittable`);
    }
    await page.getByRole("group", { name: "Viewport" }).waitFor();
    await page.getByRole("button", { name: /Fit all/ }).waitFor();
    await context.close();
  }
});

test("fields, focus rings, and scrollbars follow the design tokens in both themes", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });

  for (const colorScheme of ["dark", "light"] as const) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme });
    const page = await context.newPage();
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await waitStartOrEditor(page);
    const example = page.getByRole("button", { name: /Local diagram workspace/ });
    if (await example.isVisible().catch(() => false)) await example.click();
    await page.getByRole("button", { name: "Export" }).waitFor({ timeout: 10_000 });
    await page.locator(".node-card").first().click();

    const name = page.getByRole("textbox", { name: "Node label" });
    await name.waitFor();
    const box = await name.boundingBox();
    assert.ok(box && box.height >= 32, `${colorScheme} name field is ${box?.height}px tall`);

    // Focus paints a ring, not the browser's hairline outline.
    await name.focus();
    const focused = await name.evaluate((node) => {
      const style = getComputedStyle(node);
      return { shadow: style.boxShadow, outline: style.outlineStyle };
    });
    assert.notEqual(focused.shadow, "none", `${colorScheme} focused field has no ring`);
    assert.equal(focused.outline, "none", `${colorScheme} focused field still draws an outline`);

    // Panes scroll with the app's own scrollbar, not the OS default.
    const paneScrollbar = await page
      .locator(".outline")
      .evaluate((node) => getComputedStyle(node).scrollbarColor);
    assert.notEqual(paneScrollbar, "auto", `${colorScheme} outline uses the default scrollbar`);

    // The outline is wide enough for the tree it renders.
    const outlineBox = await page.locator(".outline").boundingBox();
    assert.ok(outlineBox && outlineBox.width >= 240, `${colorScheme} outline is ${outlineBox?.width}px wide`);
    const rowOverflow = await page
      .locator(".outline-label")
      .first()
      .evaluate((node) => node.scrollWidth - node.clientWidth);
    assert.ok(rowOverflow <= 1, `${colorScheme} outline label truncates by ${rowOverflow}px`);

    await context.close();
  }
});
