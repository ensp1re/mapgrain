import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const editorRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = resolve(editorRoot, "../..");
const dist = join(editorRoot, "dist");
const mediaDir = join(repoRoot, "docs/media");
const fixture = join(repoRoot, "skills/mapgrain/examples/ten-node.json");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

async function listen(root: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void (async () => {
      const pathName = req.url?.split("?")[0] === "/" ? "/index.html" : (req.url?.split("?")[0] ?? "/index.html");
      const file = join(root, pathName.replace(/^\/+/, ""));
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
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server address missing");
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose()))),
  };
}

async function reachEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button")].some((button) => {
        const label = button.textContent?.trim();
        return (label ?? "").includes("Arrange") || (label ?? "").includes("New architecture");
      }),
    undefined,
    { timeout: 15_000 },
  );
  if (await page.getByRole("button", { name: "Arrange" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "New", exact: true }).click();
  }
}

async function openFixture(page: Page): Promise<void> {
  await reachEditor(page);
  await page.locator('input[type="file"][aria-label="Open file"]').setInputFiles(fixture);
  await page.getByRole("button", { name: "Arrange" }).waitFor({ timeout: 10_000 });
  await page.locator(".node-title").first().waitFor({ timeout: 10_000 });
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function toGif(input: string, output: string, width: number, fps: number): void {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      input,
      "-vf",
      `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`,
      "-loop",
      "0",
      output,
    ],
    { stdio: "pipe" },
  );
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

async function packageVersion(): Promise<string> {
  const raw = JSON.parse(await readFile(join(repoRoot, "packages/cli/package.json"), "utf8")) as {
    version?: string;
  };
  return raw.version ?? "0.0.0";
}

async function main(): Promise<void> {
  await stat(join(dist, "index.html"));
  await mkdir(mediaDir, { recursive: true });
  const work = join(tmpdir(), `mapgrain-media-${Date.now()}`);
  await mkdir(work, { recursive: true });
  const server = await listen(dist);
  const browser = await chromium.launch({ headless: true });
  const artifacts: Array<Record<string, unknown>> = [];

  try {
    const stills = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await stills.newPage();
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await openFixture(page);
    await page.waitForTimeout(800);
    const heroDark = join(mediaDir, "hero-dark.png");
    await page.screenshot({ path: heroDark, type: "png" });
    artifacts.push({
      file: "docs/media/hero-dark.png",
      kind: "still",
      viewport: { width: 1440, height: 900 },
      theme: "dark",
      fixture: "skills/mapgrain/examples/ten-node.json",
    });

    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("menuitem", { name: "Commands" }).click();
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.waitForTimeout(400);
    const heroLight = join(mediaDir, "hero-light.png");
    await page.screenshot({ path: heroLight, type: "png" });
    artifacts.push({
      file: "docs/media/hero-light.png",
      kind: "still",
      viewport: { width: 1440, height: 900 },
      theme: "light",
      fixture: "skills/mapgrain/examples/ten-node.json",
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.locator(".react-flow__pane").click({ position: { x: 24, y: 80 } });
    await page.waitForTimeout(300);
    const narrow = join(mediaDir, "narrow-390.png");
    await page.screenshot({ path: narrow, type: "png" });
    artifacts.push({
      file: "docs/media/narrow-390.png",
      kind: "still",
      viewport: { width: 390, height: 844 },
      theme: "light",
      fixture: "skills/mapgrain/examples/ten-node.json",
    });
    await stills.close();

    const editVideoDir = join(work, "edit");
    await mkdir(editVideoDir, { recursive: true });
    const editContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      recordVideo: { dir: editVideoDir, size: { width: 1440, height: 900 } },
    });
    const editPage = await editContext.newPage();
    await editPage.goto(server.url, { waitUntil: "domcontentloaded" });
    await openFixture(editPage);
    await editPage.waitForTimeout(400);
    const rows = editPage.locator(".outline-row:not(.is-group)");
    await rows.nth(0).click();
    await editPage.waitForTimeout(250);
    const label = editPage.getByRole("textbox", { name: "Node label" });
    await label.waitFor();
    await label.fill("Intake clerk");
    await label.blur();
    await editPage.waitForTimeout(350);
    await rows.nth(0).click();
    await rows.nth(1).click({ modifiers: ["Shift"] });
    await editPage.getByRole("button", { name: "Connect" }).click();
    await editPage.waitForTimeout(400);
    await rows.nth(0).click();
    const pin = editPage.getByRole("checkbox", { name: "Keep position" });
    if (!(await pin.isChecked())) await pin.check();
    await editPage.getByRole("button", { name: "Arrange" }).click();
    await editPage.getByRole("button", { name: "Apply" }).waitFor({ timeout: 15_000 });
    await editPage.waitForTimeout(400);
    await editPage.getByRole("button", { name: "Apply" }).click();
    await editPage.waitForTimeout(400);
    await editPage.getByRole("button", { name: "Undo" }).click();
    await editPage.waitForTimeout(600);
    const editVideo = await editPage.video()?.path();
    await editContext.close();
    if (!editVideo) throw new Error("editing video missing");
    const editingGif = join(mediaDir, "editing.gif");
    toGif(editVideo, editingGif, 900, 12);
    artifacts.push({
      file: "docs/media/editing.gif",
      kind: "gif",
      viewport: { width: 1440, height: 900 },
      theme: "dark",
      fixture: "skills/mapgrain/examples/ten-node.json",
      notes: "select → rename → connect → pin → arrange preview → apply → undo",
    });

    const viewOut = join(work, "view.html");
    execFileSync(
      "node",
      [
        "--experimental-strip-types",
        join(repoRoot, "packages/cli/src/cli.ts"),
        "view",
        fixture,
        "-o",
        viewOut,
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );
    const viewServer = await listen(work);
    const viewVideoDir = join(work, "view");
    await mkdir(viewVideoDir, { recursive: true });
    const viewContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      recordVideo: { dir: viewVideoDir, size: { width: 1440, height: 900 } },
    });
    const viewPage = await viewContext.newPage();
    await viewPage.goto(`${viewServer.url}view.html`, { waitUntil: "domcontentloaded" });
    await viewPage.getByRole("img").or(viewPage.locator("svg")).first().waitFor({ timeout: 10_000 });
    await viewPage.waitForTimeout(400);
    await viewPage.getByRole("textbox", { name: "Search" }).fill("Capture");
    await viewPage.waitForTimeout(300);
    const hit = viewPage.getByRole("list", { name: "Search results" }).getByRole("button").first();
    if (await hit.isVisible().catch(() => false)) await hit.click();
    await viewPage.waitForTimeout(400);
    await viewPage.getByRole("button", { name: "More" }).click();
    await viewPage.getByRole("button", { name: "Theme" }).click();
    await viewPage.waitForTimeout(400);
    await viewPage.mouse.move(720, 480);
    await viewPage.mouse.down();
    await viewPage.mouse.move(820, 520);
    await viewPage.mouse.up();
    await viewPage.waitForTimeout(500);
    const viewVideo = await viewPage.video()?.path();
    await viewContext.close();
    await viewServer.close();
    if (!viewVideo) throw new Error("viewer video missing");
    const viewerGif = join(mediaDir, "viewer.gif");
    toGif(viewVideo, viewerGif, 900, 12);
    artifacts.push({
      file: "docs/media/viewer.gif",
      kind: "gif",
      viewport: { width: 1440, height: 900 },
      theme: "dark",
      fixture: "skills/mapgrain/examples/ten-node.json",
      notes: "offline HTML from mapgrain view: search, theme, pan",
    });

    const cliVideoDir = join(work, "cli");
    await mkdir(cliVideoDir, { recursive: true });
    const receipts = join(work, "receipts.html");
    const cliVersion = await packageVersion();
    const validated = execFileSync(
      "node",
      ["--experimental-strip-types", join(repoRoot, "packages/cli/src/cli.ts"), "validate", fixture],
      { cwd: repoRoot, encoding: "utf8" },
    ).trim();
    execFileSync(
      "node",
      [
        "--experimental-strip-types",
        join(repoRoot, "packages/cli/src/cli.ts"),
        "layout",
        fixture,
        "-o",
        join(work, "laid.json"),
      ],
      { cwd: repoRoot, stdio: "pipe" },
    );
    await writeFile(
      receipts,
      `<!doctype html><html><head><meta charset="utf-8"><title>CLI receipts</title>
<style>body{margin:0;background:#1c1c1f;color:#ececec;font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
main{padding:32px 40px} h1{font:600 16px/1.3 ui-sans-serif,system-ui;margin:0 0 16px}
pre{white-space:pre-wrap;background:#141416;border:1px solid #2a2a2e;padding:16px;border-radius:8px}</style></head>
<body><main><h1>npx mapgrain@${cliVersion} validate / layout</h1>
<pre>${validated.replaceAll("<", "&lt;")}\n\nlayout wrote laid.json</pre></main></body></html>`,
    );
    const receiptServer = await listen(work);
    const cliContext = await browser.newContext({
      viewport: { width: 900, height: 560 },
      deviceScaleFactor: 1,
      recordVideo: { dir: cliVideoDir, size: { width: 900, height: 560 } },
    });
    const cliPage = await cliContext.newPage();
    await cliPage.goto(`${receiptServer.url}receipts.html`, { waitUntil: "domcontentloaded" });
    await cliPage.waitForTimeout(1400);
    const cliStill = join(mediaDir, "cli-receipts.png");
    await cliPage.screenshot({ path: cliStill, type: "png" });
    const cliVideo = await cliPage.video()?.path();
    await cliContext.close();
    await receiptServer.close();
    if (!cliVideo) throw new Error("cli video missing");
    const cliGif = join(mediaDir, "cli-workflow.gif");
    toGif(cliVideo, cliGif, 900, 8);
    artifacts.push({
      file: "docs/media/cli-receipts.png",
      kind: "still",
      viewport: { width: 900, height: 560 },
      notes: "CLI validate and layout receipts; not a live agent prompt",
    });
    artifacts.push({
      file: "docs/media/cli-workflow.gif",
      kind: "gif",
      viewport: { width: 900, height: 560 },
      notes: "CLI validate/layout receipts. Live agent prompt runs remain untested.",
    });
  } finally {
    await browser.close();
    await server.close();
  }

  const files = [
    "hero-dark.png",
    "hero-light.png",
    "narrow-390.png",
    "editing.gif",
    "viewer.gif",
    "cli-receipts.png",
    "cli-workflow.gif",
  ];
  const sizes: Record<string, { bytes: number; sha256: string }> = {};
  for (const name of files) {
    const bytes = await readFile(join(mediaDir, name));
    sizes[name] = { bytes: bytes.byteLength, sha256: sha256(bytes) };
  }

  const manifest = {
    commit: git(["rev-parse", "HEAD"]),
    package: { name: "mapgrain", version: await packageVersion() },
    buildCommand: "pnpm --filter @mapgrain/editor build && pnpm --filter mapgrain build",
    fixture: "skills/mapgrain/examples/ten-node.json",
    browser: { name: "chromium", headless: true, playwright: "1.63.0" },
    deviceScaleFactor: 1,
    capturedAt: new Date().toISOString(),
    artifacts,
    sizes,
  };
  await writeFile(join(mediaDir, "capture.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, mediaDir, sizes }, null, 2)}\n`);
}

await main();
