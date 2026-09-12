import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { cpus } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { PAINT_MEASURE, PERF_WARM_REPS, SELECT_P95_BUDGET_MS } from "../../src/constants/perf.ts";
import { addKind, goNew, waitStartOrEditor } from "./helpers.ts";

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
  await page.getByRole("button", { name: "New architecture" }).waitFor({ timeout: 15_000 });
  await page.locator('input[type="file"][aria-label="Open file"]').setInputFiles(file);
  await waitEditor(page);
}

async function nodeLabels(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll(".outline-row:not(.is-group)")].map((row) => row.textContent ?? "").filter(Boolean),
  );
}

async function measureSelection(page: Page, reps: number): Promise<number[]> {
  const labels = await nodeLabels(page);
  assert.ok(labels.length >= 2, "need two nodes to alternate selection");
  const first = labels[0] ?? "";
  const second = labels[1] ?? "";
  const samples: number[] = [];
  for (let i = 0; i < reps; i += 1) {
    const label = i % 2 === 0 ? first : second;
    const ms = await page.evaluate(async (targetLabel) => {
      const buttons = [...document.querySelectorAll<HTMLButtonElement>(".outline-row:not(.is-group)")];
      const target = buttons.find((button) => (button.textContent ?? "").includes(targetLabel));
      if (!target) throw new Error(`missing ${targetLabel}`);
      const start = performance.now();
      target.click();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const selected = document.querySelector(".outline-row.is-selected");
      if (!selected || !(selected.textContent ?? "").includes(targetLabel)) {
        throw new Error(`selection did not paint ${targetLabel}`);
      }
      return performance.now() - start;
    }, label);
    samples.push(ms);
  }
  return samples;
}

async function measureTyping(page: Page, reps: number): Promise<number[]> {
  const input = page.getByRole("textbox", { name: "Search components" });
  await input.waitFor({ state: "attached", timeout: 15_000 });
  return input.evaluate(async (el, count) => {
    if (!(el instanceof HTMLInputElement)) throw new Error("search input missing");
    el.focus();
    const samples: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const start = performance.now();
      el.value = i % 2 === 0 ? "a" : "b";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      samples.push(performance.now() - start);
    }
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return samples;
  }, reps);
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
      const select = await measureSelection(page, 1 + PERF_WARM_REPS);
      const type = await measureTyping(page, 1 + PERF_WARM_REPS);
      if (errors.length > 0) throw new Error(errors.join("\n"));
      return {
        userAgent,
        select,
        type,
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
    paint: PAINT_MEASURE,
    runtime: {
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      device: cpus()[0]?.model?.trim() || `${process.platform} ${process.arch}`,
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
        reps: PERF_WARM_REPS,
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
  const hundred = report.fixtures.find((item) => item.nodes === 100);
  assert.ok(hundred);
  assert.ok(
    hundred.warm.p95.selectMs <= SELECT_P95_BUDGET_MS,
    `100-node select p95 ${hundred.warm.p95.selectMs}ms exceeds ${SELECT_P95_BUDGET_MS}ms on ${report.runtime.device}`,
  );
  assert.equal(report.browser.name, "chromium");
  assert.ok(report.browser.userAgent.includes("Chrome") || report.browser.userAgent.includes("Chromium"));
  const stored = fileURLToPath(new URL("../../../../docs/perf/browser.json", import.meta.url));
  await writeFile(stored, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
});

test("added components stay in view, selection survives editing, and shortcuts act", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console ${message.text()}`);
  });
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await waitStartOrEditor(page);
  await goNew(page);
  await page.getByRole("button", { name: "New architecture" }).click();
  await waitEditor(page);

  // A blank canvas says what to do.
  await page.getByText("Add your first component").waitFor();

  for (let index = 0; index < 5; index += 1) {
    await addKind(page, "service");
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(400);

  const cards = page.locator(".node-card");
  assert.equal(await cards.count(), 5, "five components were added");
  const canvas = await page.locator(".canvas").boundingBox();
  assert.ok(canvas);
  for (let index = 0; index < 5; index += 1) {
    const box = await cards.nth(index).boundingBox();
    assert.ok(box, `card ${index} has no box`);
    assert.ok(
      box.x + box.width > canvas.x &&
        box.x < canvas.x + canvas.width &&
        box.y + box.height > canvas.y &&
        box.y < canvas.y + canvas.height,
      `card ${index} landed outside the canvas`,
    );
  }

  // Selection survives a rename. The inspector field remounts per selected node, so wait
  // for it to rebind before typing into it.
  await cards.first().click();
  await page.waitForTimeout(400);
  const label = page.getByRole("textbox", { name: "Name", exact: true });
  await label.waitFor();
  await label.fill("Renamed service");
  await label.blur();
  await page.waitForTimeout(600);
  const bar = (await page.locator(".selection-bar").textContent().catch(() => null)) ?? "(no bar)";
  assert.match(bar, /Renamed service selected/, `the rename dropped the selection: ${bar}`);

  // An advertised shortcut acts, and only outside a field.
  await page.getByRole("button", { name: "More" }).click();
  await page.keyboard.press("n");
  await page.waitForTimeout(200);
  assert.equal(
    await page.getByRole("heading", { name: "New diagram" }).count(),
    0,
    "a letter typed inside a menu ran a global command",
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("n");
  await page.getByRole("heading", { name: "New diagram" }).waitFor({ timeout: 5_000 });

  assert.deepEqual(problems, []);
  await context.close();
});

test("a template opens as an editable copy and walks through step by step", async (t) => {
  await stat(join(dist, "index.html"));
  const server = await listen();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console ${message.text()}`);
  });
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await waitStartOrEditor(page);
  await goNew(page);

  // Search narrows the gallery, and a card opens the real document.
  await page.getByRole("searchbox", { name: "Search templates" }).fill("oauth");
  const card = page.getByRole("button", { name: "Use template OAuth sign-in" });
  await card.waitFor();
  assert.equal(await page.locator(".template-card").count(), 1, "search did not narrow the gallery");
  await card.click();
  await waitEditor(page);
  assert.equal(
    await page.getByRole("textbox", { name: "Document title" }).inputValue(),
    "OAuth sign-in",
  );

  // It is a copy: editing it changes this document, not the catalog entry.
  await page.locator(".node-card").first().click();
  await page.waitForTimeout(400);
  const label = page.getByRole("textbox", { name: "Name", exact: true });
  await label.fill("My browser");
  await label.blur();
  await page.waitForTimeout(400);
  assert.match((await page.locator(".outline").textContent()) ?? "", /My browser/);

  // The walkthrough reads the diagram without changing it.
  await page.locator(".canvas").click({ position: { x: 40, y: 300 } });
  await page.keyboard.press("w");
  const walk = page.locator(".walk-bar");
  await walk.waitFor({ timeout: 5_000 });
  const first = (await walk.textContent()) ?? "";
  assert.match(first, /1 \/ \d+/);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  assert.match((await walk.textContent()) ?? "", /2 \/ \d+/);
  assert.equal(await page.locator(".is-walk-step").count() > 0, true, "no step is highlighted");
  await page.keyboard.press("Escape");
  await walk.waitFor({ state: "detached", timeout: 5_000 });
  assert.match((await page.locator(".outline").textContent()) ?? "", /My browser/, "walking edited the document");

  assert.deepEqual(problems, []);
  await context.close();
});
