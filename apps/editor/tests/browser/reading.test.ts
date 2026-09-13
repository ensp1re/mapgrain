import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { goNew, waitStartOrEditor } from "./helpers.ts";
import { DIAGRAM_FONT_SIZE, READING_LABEL_SIZE } from "../../src/constants/diagram.ts";

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

test("a template keeps readable labels after default fit and shows zoom", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await waitStartOrEditor(page);
  if (await page.getByRole("button", { name: "Arrange" }).isVisible().catch(() => false)) {
    await goNew(page);
  }
  await page.getByRole("button", { name: "Use template System context" }).click();
  await page.getByRole("button", { name: "Arrange" }).waitFor({ timeout: 10_000 });
  const zoomLabel = page.locator(".zoom-readout");
  await zoomLabel.waitFor({ timeout: 10_000 });
  const zoomText = (await zoomLabel.textContent()) ?? "";
  assert.match(zoomText, /^\d+%$/);
  const zoom = Number(zoomText.replace("%", "")) / 100;
  const fontSize = await page.locator(".node-title").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  assert.ok(fontSize >= DIAGRAM_FONT_SIZE - 0.5, `title font ${fontSize}`);
  assert.ok(fontSize * zoom >= READING_LABEL_SIZE - 0.5, `effective ${fontSize * zoom} at zoom ${zoom}`);

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Commands" }).click();
  const command = page.getByRole("dialog", { name: "Command menu" });
  await command.waitFor();
  await page.keyboard.press("Escape");
  await command.waitFor({ state: "hidden" });

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Help" }).click();
  const help = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await help.waitFor();
  const helpText = (await help.innerText()) ?? "";
  assert.match(helpText, /Command menu/);
  assert.match(helpText, /Undo/);
  assert.match(helpText, /Keyboard shortcuts/);
  await page.getByRole("button", { name: "Close Keyboard shortcuts" }).click();
  await help.waitFor({ state: "hidden" });
  await page.keyboard.press("?");
  await help.waitFor();
  await page.keyboard.press("Escape");
  await help.waitFor({ state: "hidden" });
});

test("canvas captions keep the scene's placement instead of stacking on each other", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });

  // Lane-crossing and branching diagrams are where captions used to pile up.
  for (const name of ["Approval swimlanes", "Microservices behind a gateway", "Order state machine"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await waitStartOrEditor(page);
    const card = page.getByRole("button", { name: `Use template ${name}` });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.locator(".node-card").first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
    const result = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll(".edge-caption")].map((node) =>
        node.getBoundingClientRect(),
      );
      const hits: string[] = [];
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          if (!a || !b) continue;
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
            hits.push(`${i}/${j}`);
          }
        }
      }
      return { captions: boxes.length, hits };
    });
    assert.ok(result.captions > 0, `${name} drew no captions`);
    assert.deepEqual(result.hits, [], `${name} stacked captions`);
    await context.close();
  }
});

test("a card is wide enough for its own name, so no title breaks mid-word", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });

  // Capitals run much wider than lowercase, which is where the width estimate used to fall short.
  for (const name of ["Order state machine", "Microservices behind a gateway", "Approval swimlanes"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await waitStartOrEditor(page);
    const card = page.getByRole("button", { name: `Use template ${name}` });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.locator(".node-card").first().waitFor({ timeout: 10_000 });
    await page.waitForFunction(() => document.fonts.status === "loaded", undefined, { timeout: 10_000 });
    await page.waitForTimeout(500);
    const wrapped = await page.evaluate(() =>
      [...document.querySelectorAll(".node-title")]
        // A branch label wraps on purpose: the diamond around it is twice the text block.
        .filter((title) => !title.closest('[data-shape="decision"]'))
        .filter((title) => {
          const line = parseFloat(getComputedStyle(title).lineHeight);
          return (title as HTMLElement).offsetHeight > line * 1.5;
        })
        .map((title) => title.textContent ?? ""),
    );
    assert.deepEqual(wrapped, [], `${name} wrapped a card title`);
    await context.close();
  }
});

test("a branch draws as an outlined diamond that holds its own label", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await waitStartOrEditor(page);
  const card = page.getByRole("button", { name: "Use template CI/CD pipeline" });
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.locator(".node-card").first().waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => document.fonts.status === "loaded", undefined, { timeout: 10_000 });
  await page.waitForTimeout(600);

  const diamond = page.locator('.node-card[data-shape="decision"]').first();
  await diamond.waitFor({ timeout: 10_000 });

  const fits = await diamond.evaluate((card) => {
    const box = card.getBoundingClientRect();
    const text = card.querySelector(".node-text")?.getBoundingClientRect();
    if (!text) return null;
    // A diamond's half-width at a given height shrinks toward its points. Every corner of the
    // text block has to sit inside the polygon, which is what the old 1.35x box did not do.
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const inside = (x: number, y: number) =>
      Math.abs(x - cx) / (box.width / 2) + Math.abs(y - cy) / (box.height / 2) <= 1.0001;
    return {
      corners: [
        inside(text.left, text.top),
        inside(text.right, text.top),
        inside(text.left, text.bottom),
        inside(text.right, text.bottom),
      ],
      filled: getComputedStyle(card).backgroundImage,
    };
  });
  assert.ok(fits, "the diamond drew no label");
  assert.deepEqual(fits.corners, [true, true, true, true], "the label leaves the diamond");
  // Outlined, not a solid block: the fill is a colour, with a ::before putting the surface back.
  assert.equal(fits.filled, "none", fits.filled);
});
