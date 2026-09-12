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

/** Clicks the middle of a drawn connection, which is where its hit stroke is. */
async function clickEdge(page: Page, index = 0): Promise<void> {
  const box = await page.locator(".react-flow__edge").nth(index).locator(".edge-hit").boundingBox();
  assert.ok(box, "the connection drew no hit area");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(250);
}

test("a connection can be selected, and it says which components it joins", async (t) => {
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

  // Select a card first: clicking a connection used to silently un-ring it and change nothing.
  await page.locator(".node-card").first().click();
  await page.waitForTimeout(300);
  await page.locator(".inspector .pane-label", { hasText: "Component" }).waitFor({ timeout: 5_000 });

  const row = page.locator(".outline-row.is-connection").first();
  await row.waitFor({ timeout: 5_000 });
  await row.click();
  await page.waitForTimeout(300);

  await page.locator(".inspector .pane-label", { hasText: "Connection" }).waitFor({ timeout: 5_000 });
  const ends = page.locator(".relation-end");
  assert.equal(await ends.count(), 2, "the inspector must name both ends");
  const from = (await ends.first().innerText()).trim();
  assert.ok(from.length > 0);

  // Both end cards are lit so the reader can see where the connection goes.
  assert.equal(await page.locator(".react-flow__node.is-relation-end").count(), 2);
  assert.equal(await page.locator(".node-card.is-selected").count(), 0, "a card must not stay selected too");

  // Clicking that end button selects the component it names.
  await ends.first().click();
  await page.waitForTimeout(300);
  await page.locator(".inspector .pane-label", { hasText: "Component" }).waitFor({ timeout: 5_000 });
  assert.equal(await page.getByRole("textbox", { name: "Name", exact: true }).inputValue(), from);
});

test("clicking a line on the canvas selects it", async (t) => {
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

  await clickEdge(page);
  await page.locator(".inspector .pane-label", { hasText: "Connection" }).waitFor({ timeout: 5_000 });
  assert.equal(await page.locator(".react-flow__edge.selected").count(), 1);
});

test("a caption is typed on the canvas and the change is undoable", async (t) => {
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

  const caption = page.locator(".edge-caption").first();
  const before = (await caption.innerText()).trim();
  await caption.dblclick();
  const input = page.getByRole("textbox", { name: "Connection label" });
  await input.waitFor({ timeout: 5_000 });
  await input.fill("handed over");
  await input.press("Enter");
  await page.waitForTimeout(400);
  assert.ok(
    (await page.locator(".edge-caption").allInnerTexts()).some((text) => text.includes("handed over")),
    "the typed caption did not reach the canvas",
  );

  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(400);
  assert.ok(
    (await page.locator(".edge-caption").allInnerTexts()).some((text) => text.includes(before)),
    "undo did not restore the caption",
  );
});

test("a connection's line shape is chosen, saved and redrawn", async (t) => {
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

  // Pick a connection that actually turns a corner, so straight and curved differ from it.
  const rows = page.locator(".outline-row.is-connection");
  let elbow: string | null = null;
  for (let index = 0; index < (await rows.count()); index += 1) {
    await rows.nth(index).click();
    await page.waitForTimeout(250);
    const d = await page.locator(".react-flow__edge.selected .react-flow__edge-path").getAttribute("d");
    if (d?.includes("Q")) {
      elbow = d;
      break;
    }
  }
  assert.ok(elbow, "no connection in this template turns a corner");
  await page.locator(".inspector .pane-label", { hasText: "Connection" }).waitFor({ timeout: 5_000 });

  const pathOf = () =>
    page.locator(".react-flow__edge.selected .react-flow__edge-path").getAttribute("d");

  await page.getByRole("button", { name: /^Line shape/ }).click();
  await page.getByRole("option", { name: "Curved" }).click();
  await page.waitForTimeout(500);
  const curved = await pathOf();
  assert.notEqual(curved, elbow, "choosing curved did not redraw the line");
  assert.ok(curved?.includes("C"), `a curve is cubic: ${curved}`);

  // It is saved in the document, so a reload still draws a curve.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".node-card").first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  const paths = await page.locator(".react-flow__edge-path").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("d") ?? ""),
  );
  assert.ok(paths.some((d) => d.includes("C")), "the curve did not survive a reload");
});

test("an endpoint is dragged onto another card, and the document follows", async (t) => {
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

  await page.locator(".outline-row.is-connection").first().click();
  await page.waitForTimeout(300);
  const target = (await page.locator(".relation-end").nth(1).innerText()).trim();

  const anchor = page.locator(".react-flow__edgeupdater").last();
  await anchor.waitFor({ timeout: 5_000 });
  const from = await anchor.boundingBox();
  assert.ok(from, "no endpoint anchor rendered");

  // Drop it on a card that is not already an end of this connection.
  const cards = page.locator(".react-flow__node:not(.react-flow__node-group)");
  let landed: { x: number; y: number } | null = null;
  for (let index = 0; index < (await cards.count()); index += 1) {
    const card = cards.nth(index);
    const name = (await card.locator(".node-title").innerText()).trim();
    if (name === target) continue;
    const box = await card.boundingBox();
    if (!box) continue;
    landed = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    break;
  }
  assert.ok(landed, "no other card to drop on");

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(landed.x, landed.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  const ends = await page.locator(".relation-end").allInnerTexts();
  assert.notEqual(ends[1]?.trim(), target, `the endpoint did not move: ${ends.join(" → ")}`);
  assert.equal(await page.getByRole("button", { name: "Undo" }).isDisabled(), false);
});

test("a sequence message is as editable as a card, and a lifeline selects its participant", async (t) => {
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
  await useTemplate(page, "OAuth sign-in");

  await page.locator(".outline-row.is-connection").first().click();
  await page.waitForTimeout(300);
  await page.locator(".inspector .pane-label", { hasText: "Connection" }).waitFor({ timeout: 5_000 });
  await page.getByRole("spinbutton", { name: "Message order" }).waitFor({ timeout: 5_000 });

  const caption = page.locator(".edge-caption").first();
  await caption.dblclick();
  const input = page.getByRole("textbox", { name: "Connection label" });
  await input.waitFor({ timeout: 5_000 });
  await input.fill("start checkout");
  await input.press("Enter");
  await page.waitForTimeout(400);
  assert.ok(
    (await page.locator(".edge-caption").allInnerTexts()).some((text) => text.includes("start checkout")),
  );

  const lifeline = page.locator(".lifeline-hit").first();
  await lifeline.click({ force: true });
  await page.waitForTimeout(300);
  await page.locator(".inspector .pane-label", { hasText: "Component" }).waitFor({ timeout: 5_000 });
});
