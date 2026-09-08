import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium, type Page } from "playwright";

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const fixtures = fileURLToPath(new URL("../../../../tests/fixtures/documents", import.meta.url));
const branching = fileURLToPath(new URL("../../../../skills/mapgrain/examples/branching.json", import.meta.url));
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
};

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

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

async function openDocument(page: Page, file: string): Promise<void> {
  await page.locator('input[type="file"][aria-label="Open file"]').setInputFiles(file);
  await page.getByRole("button", { name: "Arrange" }).waitFor({ timeout: 15_000 });
}

async function measureSelection(page: Page, reps: number): Promise<number[]> {
  const samples: number[] = [];
  const first = page.locator(".outline-row").nth(0);
  const second = page.locator(".outline-row").nth(1);
  await first.waitFor({ timeout: 10_000 });
  await second.waitFor({ timeout: 10_000 });
  for (let i = 0; i < reps; i += 1) {
    const row = i % 2 === 0 ? first : second;
    const start = performance.now();
    await row.click({ timeout: 10_000 });
    samples.push(performance.now() - start);
  }
  return samples;
}

async function measureTyping(page: Page, reps: number): Promise<number[]> {
  const samples: number[] = [];
  const input = page.getByLabel("Document title");
  await input.click({ timeout: 10_000 });
  for (let i = 0; i < reps; i += 1) {
    const start = performance.now();
    await page.keyboard.press("a");
    samples.push(performance.now() - start);
  }
  return samples;
}

test("selection and typing p95 are measured on 10 and 100 node maps", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  t.after(async () => {
    await browser.close();
    await server.close();
  });

  const report: {
    measuredAt: string;
    runtime: { node: string; platform: string; arch: string; device: string };
    browser: { name: string; headless: boolean; userAgent: string };
    fixtures: Array<{
      name: string;
      nodes: number;
      cold: { selectMs: number; typeMs: number };
      warm: {
        reps: number;
        p50: { selectMs: number; typeMs: number };
        p95: { selectMs: number; typeMs: number };
      };
    }>;
  } = {
    measuredAt: new Date().toISOString(),
    runtime: {
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      device: `${process.platform} ${process.arch}`,
    },
    browser: {
      name: "chromium",
      headless: true,
      userAgent: "",
    },
    fixtures: [],
  };

  const files = [
    { name: "branching.json", path: branching, nodes: 10 },
    { name: "hundred-nodes.json", path: join(fixtures, "hundred-nodes.json"), nodes: 100 },
  ];

  for (const fixture of files) {
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    report.browser.userAgent = await page.evaluate(() => navigator.userAgent);
    const newButton = page.getByRole("button", { name: "New", exact: true });
    if (await newButton.isVisible().catch(() => false)) await newButton.click();
    await page.getByRole("button", { name: "New blank diagram" }).waitFor({ timeout: 10_000 });
    await openDocument(page, fixture.path);
    const coldSelect = await measureSelection(page, 1);
    const coldType = await measureTyping(page, 1);
    const warmSelect = await measureSelection(page, 8);
    const warmType = await measureTyping(page, 8);
    report.fixtures.push({
      name: fixture.name,
      nodes: fixture.nodes,
      cold: { selectMs: coldSelect[0] ?? 0, typeMs: coldType[0] ?? 0 },
      warm: {
        reps: 8,
        p50: { selectMs: percentile(warmSelect, 50), typeMs: percentile(warmType, 50) },
        p95: { selectMs: percentile(warmSelect, 95), typeMs: percentile(warmType, 95) },
      },
    });
  }

  for (const fixture of report.fixtures) {
    assert.ok(fixture.cold.selectMs >= 0);
    assert.ok(fixture.warm.p95.selectMs >= fixture.warm.p50.selectMs);
    assert.ok(fixture.warm.p95.typeMs >= fixture.warm.p50.typeMs);
  }
  assert.equal(report.browser.name, "chromium");
  assert.ok(report.browser.userAgent.includes("Chrome") || report.browser.userAgent.includes("Chromium"));
  console.log(JSON.stringify(report));
});
