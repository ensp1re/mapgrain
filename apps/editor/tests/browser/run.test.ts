import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium, type Page } from "playwright";
import { useTemplate, waitStartOrEditor } from "./helpers.ts";

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

/** Cards and connections React Flow is actually drawing, ignoring the ones marked hidden. */
async function drawn(page: Page): Promise<{ nodes: number; edges: number }> {
  return page.evaluate(() => ({
    nodes: document.querySelectorAll(".react-flow__node:not(.react-flow__node-group)").length,
    edges: document.querySelectorAll(".react-flow__edge").length,
  }));
}

test("hiding components and a lane takes them off the canvas, and Show all brings them back", async (t) => {
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
  await useTemplate(page, "Approval swimlanes");

  const before = await drawn(page);
  assert.ok(before.nodes >= 4, `expected a populated canvas, saw ${before.nodes}`);

  const eyes = page.locator(".outline-eye");
  await eyes.first().waitFor({ timeout: 10_000 });
  const total = await eyes.count();
  assert.ok(total >= 3, `expected eye toggles in the outline, saw ${total}`);

  // Two rows, then a lane row — the outline lists lanes above the components they hold.
  await eyes.nth(total - 1).click();
  await eyes.nth(total - 2).click();
  await eyes.nth(0).click();
  await page.waitForTimeout(300);

  const banner = page.locator(".hidden-banner");
  await banner.waitFor({ timeout: 5_000 });
  assert.match((await banner.innerText()) ?? "", /hidden from view/);

  const after = await drawn(page);
  assert.ok(after.nodes < before.nodes, `hiding drew ${after.nodes} of ${before.nodes} cards`);
  assert.ok(after.edges <= before.edges, "hiding a component must not add connections");

  await page.getByRole("button", { name: "Show all" }).click();
  await banner.waitFor({ state: "hidden", timeout: 5_000 });
  await page.waitForTimeout(300);
  assert.deepEqual(await drawn(page), before, "everything hidden must come back");
});

test("hiding every connection leaves the components readable on their own", async (t) => {
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
  await useTemplate(page, "Order state machine");

  const before = await drawn(page);
  assert.ok(before.edges > 0, "the template drew no connections");

  await page.getByRole("button", { name: "Hide connections" }).click();
  await page.waitForTimeout(300);
  const hidden = await drawn(page);
  assert.equal(hidden.nodes, before.nodes, "hiding links must keep every component");
  assert.ok(hidden.edges < before.edges, `still drew ${hidden.edges} connections`);

  await page.getByRole("button", { name: "Show connections" }).click();
  await page.waitForTimeout(300);
  assert.deepEqual(await drawn(page), before);
});

test("a walkthrough plays on its own and stops at the last step", async (t) => {
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
  await useTemplate(page, "Order state machine");

  await page.keyboard.press("w");
  const bar = page.getByRole("group", { name: "Walkthrough" });
  await bar.waitFor({ timeout: 10_000 });
  const count = page.locator(".walk-count");
  const stepOf = async () => Number(((await count.innerText()) ?? "1 / 1").split("/")[0]?.trim());
  const steps = Number(((await count.innerText()) ?? "1 / 1").split("/")[1]?.trim());
  assert.ok(steps > 1, `expected several steps, saw ${steps}`);
  assert.equal(await stepOf(), 1);

  // Playing is the default, so it advances with no further input.
  await page.waitForFunction(
    () => (document.querySelector(".walk-count")?.textContent ?? "").trim().startsWith("2"),
    undefined,
    { timeout: 10_000 },
  );

  await page.waitForFunction(
    (last) => {
      const text = (document.querySelector(".walk-count")?.textContent ?? "").trim();
      return text.startsWith(String(last));
    },
    steps,
    { timeout: 30_000 },
  );
  // And it stops rather than looping back to the start.
  await page.waitForTimeout(2_500);
  assert.equal(await stepOf(), steps);

  await page.keyboard.press("Escape");
  await bar.waitFor({ state: "hidden", timeout: 5_000 });
});

test("firing transitions moves the run and leaves the document untouched", async (t) => {
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
  await useTemplate(page, "Order state machine");

  const cards = await page.locator(".node-title").allInnerTexts();

  await page.keyboard.press("r");
  const bar = page.getByRole("group", { name: "Run" });
  await bar.waitFor({ timeout: 10_000 });
  const now = bar.locator(".run-now strong");
  const first = await now.innerText();

  const seen: string[] = [first];
  for (let step = 0; step < 3; step += 1) {
    const moves = bar.locator(".run-move");
    if ((await moves.count()) === 0) break;
    await moves.first().click();
    await page.waitForTimeout(300);
    seen.push(await now.innerText());
  }
  assert.equal(seen.length, 4, `the run stalled after ${seen.length - 1} transitions`);
  assert.notEqual(seen[1], seen[0], "firing did not move the run");

  const log = bar.locator(".run-log li");
  assert.equal(await log.count(), 3, "the event log did not record three transitions");
  assert.match((await log.first().innerText()) ?? "", new RegExp(seen[0] ?? ""));

  // Reading a diagram never writes to it: nothing to undo, and no card changed.
  const undo = page.getByRole("button", { name: "Undo" });
  assert.equal(await undo.isDisabled(), true, "a run must not produce an undoable edit");

  await bar.getByRole("button", { name: "Reset" }).click();
  await page.waitForTimeout(200);
  assert.equal(await now.innerText(), first, "reset must return to the entry state");
  assert.equal(await bar.locator(".run-log li").count(), 0);

  await bar.getByRole("button", { name: "Done" }).click();
  await bar.waitFor({ state: "hidden", timeout: 5_000 });
  assert.deepEqual(await page.locator(".node-title").allInnerTexts(), cards);
});
