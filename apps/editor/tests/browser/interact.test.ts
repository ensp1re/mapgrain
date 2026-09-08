import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium, type Browser, type Page } from "playwright";

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

async function chromeDump(page: Page): Promise<string> {
  return page.evaluate(() =>
    JSON.stringify({
      title: Boolean(document.querySelector('input[aria-label="Document title"]')),
      search: Boolean(document.querySelector('input[aria-label="Search components"]')),
      arrange: Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === "Arrange"),
      rows: document.querySelectorAll(".outline-row").length,
      recovery: Boolean(document.querySelector('[aria-label="Editor recovery"]')),
      start: Boolean(document.querySelector('[aria-label="New diagram"]')),
      text: document.body?.innerText?.slice(0, 400) ?? "",
    }),
  );
}

async function waitEditor(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Arrange" }).waitFor({ timeout: 15_000 });
  await page.getByRole("textbox", { name: "Search components" }).waitFor({ state: "attached", timeout: 15_000 });
}

async function openImported(page: Page, file: string): Promise<void> {
  await page.getByRole("button", { name: "New blank diagram" }).waitFor({ timeout: 15_000 });
  await page.locator('input[type="file"][aria-label="Open file"]').setInputFiles(file);
  await waitEditor(page);
}

async function measureSelection(page: Page, reps: number): Promise<number[]> {
  const row = page.locator(".outline-row").first();
  await row.waitFor({ state: "attached", timeout: 15_000 });
  const samples: number[] = [];
  for (let i = 0; i < reps; i += 1) {
    const start = performance.now();
    await row.click({ timeout: 15_000, force: true });
    samples.push(performance.now() - start);
  }
  return samples;
}

async function measureTyping(page: Page, reps: number): Promise<number[]> {
  const input = page.getByRole("textbox", { name: "Search components" });
  await input.waitFor({ state: "attached", timeout: 15_000 });
  await input.evaluate((el) => {
    if (!(el instanceof HTMLInputElement)) throw new Error("search input missing");
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  });
  const samples: number[] = [];
  for (let i = 0; i < reps; i += 1) {
    const start = performance.now();
    await page.keyboard.press("a");
    samples.push(performance.now() - start);
  }
  await input.evaluate((el) => {
    if (!(el instanceof HTMLInputElement)) return;
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return samples;
}

async function measureFixture(
  browser: Browser,
  url: string,
  file: string,
): Promise<{ select: number[]; type: number[]; userAgent: string }> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  try {
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const userAgent = await page.evaluate(() => navigator.userAgent);
    try {
      await openImported(page, file);
      const coldSelect = await measureSelection(page, 1);
      const coldType = await measureTyping(page, 1);
      const warmSelect = await measureSelection(page, 8);
      const warmType = await measureTyping(page, 8);
      if (errors.length > 0) throw new Error(errors.join("\n"));
      return {
        userAgent,
        select: [...coldSelect, ...warmSelect],
        type: [...coldType, ...warmType],
      };
    } catch (error) {
      const dump = await chromeDump(page).catch(() => "dump failed");
      const pageErrors = errors.length > 0 ? ` pageErrors=${errors.join(" | ")}` : "";
      throw new Error(`${error instanceof Error ? error.message : String(error)} chrome=${dump}${pageErrors}`);
    }
  } finally {
    await context.close();
  }
}

test("selection and typing p95 are measured on 10 and 100 node maps", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });

  const files = [
    { name: "branching.json", path: branching, nodes: 10 },
    { name: "hundred-nodes.json", path: join(fixtures, "hundred-nodes.json"), nodes: 100 },
  ];

  const report = {
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
    fixtures: [] as Array<{
      name: string;
      nodes: number;
      cold: { selectMs: number; typeMs: number };
      warm: { reps: number; p50: { selectMs: number; typeMs: number }; p95: { selectMs: number; typeMs: number } };
    }>,
  };

  for (const fixture of files) {
    const measured = await measureFixture(browser, server.url, fixture.path);
    report.browser.userAgent = measured.userAgent;
    const selectWarm = measured.select.slice(1);
    const typeWarm = measured.type.slice(1);
    report.fixtures.push({
      name: fixture.name,
      nodes: fixture.nodes,
      cold: { selectMs: measured.select[0] ?? 0, typeMs: measured.type[0] ?? 0 },
      warm: {
        reps: 8,
        p50: { selectMs: percentile(selectWarm, 50), typeMs: percentile(typeWarm, 50) },
        p95: { selectMs: percentile(selectWarm, 95), typeMs: percentile(typeWarm, 95) },
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
