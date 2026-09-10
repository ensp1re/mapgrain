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

test("production bundle stays usable after disconnect, arrange, and reload", async (t) => {
  await stat(join(dist, "index.html"));
  await stat(join(dist, "offline-manifest.json"));
  const manifest = JSON.parse(await readFile(join(dist, "offline-manifest.json"), "utf8")) as {
    version: string;
    assets: string[];
  };
  assert.ok(manifest.version);
  assert.ok(manifest.assets.some((path) => path.includes("elk-worker")));
  assert.ok(manifest.assets.some((path) => path.endsWith(".woff2")));
  assert.ok(manifest.assets.includes("/index.html"));

  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  t.after(async () => {
    await context.close();
    await browser.close();
    await server.close();
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.documentElement.dataset.offline === "ready",
    undefined,
    { timeout: 20_000 },
  );
  const arrange = page.getByRole("button", { name: "Arrange" });
  const start = page.getByRole("button", { name: "New architecture" });
  async function reachEditor(): Promise<void> {
    await waitStartOrEditor(page);
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      await arrange.waitFor({ timeout: 10_000 });
    }
  }
  await reachEditor();
  await context.setOffline(true);
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await reachEditor();
  await arrange.click();
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "JSON" }).click();
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await reachEditor();
  assert.equal(errors.join("\n"), "");
});
