import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

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
    const arrange = page.getByRole("button", { name: "Arrange" });
    const start = page.getByRole("button", { name: "New blank diagram" });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("button")].some((button) => {
          const label = button.textContent?.trim();
          return label === "Arrange" || label === "New blank diagram";
        }),
      undefined,
      { timeout: 15_000 },
    );
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      await arrange.waitFor({ timeout: 10_000 });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${viewport.width}x${viewport.height} overflow ${overflow}`);
    await page.getByRole("button", { name: "Add", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Add service" }).count(), 0);
    const arrangeBox = await page.getByRole("button", { name: "Arrange" }).boundingBox();
    assert.ok(arrangeBox && arrangeBox.width > 8 && arrangeBox.height > 8, `${viewport.width} Arrange not hittable`);
    const more = page.getByRole("button", { name: "More" });
    if (viewport.width <= 390) {
      await more.click();
      const undo = page.getByRole("button", { name: "Undo" }).first();
      await undo.waitFor();
      const undoBox = await undo.boundingBox();
      assert.ok(undoBox && undoBox.height > 8, `${viewport.width} More menu clipped`);
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "Fit all" }).waitFor();
    await context.close();
  }
});
