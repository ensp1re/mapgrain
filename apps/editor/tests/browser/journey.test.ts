import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { addKind, goNew, openExport, waitStartOrEditor } from "./helpers.ts";

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

test("blank through export and reimport keeps ids on the production build", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await waitStartOrEditor(page);
  if (await page.getByRole("button", { name: "Arrange" }).isVisible().catch(() => false)) {
    await goNew(page);
  }
  await page.getByRole("button", { name: "New architecture" }).click();
  await page.getByRole("button", { name: "Arrange" }).waitFor({ timeout: 10_000 });

  await addKind(page, "service");
  await addKind(page, "datastore");
  await page.locator(".outline-row:not(.is-group)").nth(1).waitFor();

  const rows = page.locator(".outline-row:not(.is-group)");
  await rows.nth(0).click();
  await rows.nth(1).click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByTestId("rf__edge-e1").waitFor({ state: "attached", timeout: 5_000 });

  await page.locator(".outline-row:not(.is-group)").first().click();
  const label = page.getByRole("textbox", { name: "Name", exact: true });
  await label.waitFor();
  await label.fill("API");
  await label.blur();
  assert.equal(await label.inputValue(), "API");

  const box = await page.getByTestId("rf__node-n1").boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 40);
  await page.mouse.up();

  await page.getByRole("checkbox", { name: "Keep position" }).check();
  await page.getByRole("button", { name: "Arrange" }).click();
  await page.getByRole("button", { name: "Apply" }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Redo" }).click();
  await page.getByText("Saved", { exact: true }).waitFor({ timeout: 10_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Arrange" }).waitFor({ timeout: 10_000 });
  await page.locator(".outline-row:not(.is-group)").filter({ hasText: "API" }).click();
  assert.equal(await page.getByRole("textbox", { name: "Name", exact: true }).inputValue(), "API");

  await openExport(page);
  await page.getByRole("button", { name: "Story WebM" }).waitFor();
  const formats = [
    { name: "JSON", file: "diagram.json" },
    { name: "SVG", file: "diagram.svg" },
    { name: "PNG", file: "diagram.png" },
    { name: "HTML", file: "diagram.html" },
  ] as const;
  const saved: Record<string, string> = {};
  for (const format of formats) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      page.getByRole("button", { name: format.name, exact: true }).click(),
    ]);
    assert.equal(download.suggestedFilename(), format.file);
    const dest = join(tmpdir(), `mapgrain-${format.file}`);
    await download.saveAs(dest);
    saved[format.name] = dest;
    const bytes = await readFile(dest);
    assert.ok(bytes.byteLength > 20, format.name);
  }
  const json = JSON.parse(await readFile(saved.JSON, "utf8")) as { nodes: Array<{ id: string; label: string }> };
  assert.ok(json.nodes.some((node) => node.label === "API"));
  const svg = await readFile(saved.SVG, "utf8");
  assert.match(svg, /API/);
  const html = await readFile(saved.HTML, "utf8");
  assert.match(html, /Read-only view/);
  assert.match(html, /API/);

  await page.getByRole("button", { name: "Close Export" }).click();
  await goNew(page);
  await page.locator('input[type="file"][aria-label="Open file"]').setInputFiles(saved.JSON);
  await page.getByRole("button", { name: "Arrange" }).waitFor({ timeout: 10_000 });
  await page.locator(".outline-row:not(.is-group)").filter({ hasText: "API" }).first().waitFor();
  const reimported = await page.locator(".outline-row:not(.is-group)").count();
  assert.equal(reimported, json.nodes.length);
});
