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

test("production build opens a blank diagram and every example without page errors", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  t.after(async () => {
    await browser.close();
    await server.close();
  });

  const editorReady = () => page.getByRole("button", { name: "Arrange" });

  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "New blank diagram" }).click();
  await editorReady().waitFor({ timeout: 10_000 });
  assert.equal(errors.join("\n"), "", "blank");

  await page.getByRole("button", { name: "New", exact: true }).click();
  const examples = [
    "Local diagram workspace",
    "Review workflow",
    "Feedback loop",
    "Checkout messages",
    "Ingest data flow",
    "Session lifecycle",
  ];
  for (const name of examples) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await editorReady().waitFor({ timeout: 10_000 });
    assert.equal(errors.join("\n"), "", name);
    await page.getByRole("button", { name: "New", exact: true }).click();
  }

  await page.getByRole("button", { name: "New blank diagram" }).click();
  await editorReady().waitFor();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("option", { name: "service" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByText("Saved", { exact: true }).waitFor({ timeout: 10_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await editorReady().waitFor({ timeout: 10_000 });
  assert.equal(await page.getByRole("textbox", { name: "Document title" }).inputValue(), "Untitled diagram");
  assert.equal(errors.join("\n"), "");
});
