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

test("showcase example keeps readable labels after default fit and shows zoom", async (t) => {
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
  await page.getByRole("button", { name: /Feedback loop/ }).click();
  await page.getByRole("button", { name: "Arrange" }).waitFor({ timeout: 10_000 });
  const zoomLabel = page.locator(".zoom-readout");
  await zoomLabel.waitFor({ timeout: 10_000 });
  const zoomText = (await zoomLabel.textContent()) ?? "";
  assert.match(zoomText, /^\d+%$/);
  const zoom = Number(zoomText.replace("%", "")) / 100;
  const fontSize = await page.locator(".node-title").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  assert.ok(fontSize >= DIAGRAM_FONT_SIZE - 0.5, `title font ${fontSize}`);
  assert.ok(fontSize * zoom >= READING_LABEL_SIZE - 0.5, `effective ${fontSize * zoom} at zoom ${zoom}`);

  await page.getByRole("button", { name: "Commands" }).click();
  const command = page.getByRole("dialog", { name: "Command menu" });
  await command.waitFor();
  await page.keyboard.press("Escape");
  await command.waitFor({ state: "hidden" });

  await page.getByRole("button", { name: "Help" }).click();
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
