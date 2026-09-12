import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appPath = fileURLToPath(new URL("../src/styles/app.css", import.meta.url));
const tokensPath = fileURLToPath(new URL("../src/styles/tokens.css", import.meta.url));

async function sheets(): Promise<{ app: string; tokens: string }> {
  return {
    app: await readFile(appPath, "utf8"),
    tokens: await readFile(tokensPath, "utf8"),
  };
}

test("every custom property the chrome reads without a fallback is defined", async () => {
  const { app, tokens } = await sheets();
  const defined = new Set(
    [...`${tokens}\n${app}`.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1]),
  );
  const missing = new Set<string>();
  for (const match of app.matchAll(/var\((--[a-z0-9-]+)\s*([,)])/g)) {
    if (match[2] === ",") continue;
    if (!defined.has(match[1] ?? "")) missing.add(match[1] ?? "");
  }
  assert.deepEqual([...missing], [], "undefined custom properties");
});

test("light and dark define the same token names", async () => {
  const { tokens } = await sheets();
  const names = (theme: string) => {
    const block = new RegExp(`:root\\[data-theme="${theme}"\\] \\{([\\s\\S]*?)\\n\\}`).exec(tokens);
    assert.ok(block, `${theme} block`);
    return new Set([...(block[1] ?? "").matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]));
  };
  assert.deepEqual([...names("dark")].sort(), [...names("light")].sort());
});

test("scroll containers and fields carry the app's own chrome", async () => {
  const { app } = await sheets();
  assert.match(app, /::-webkit-scrollbar-thumb/);
  assert.match(app, /scrollbar-color: var\(--border\) transparent/);
  for (const pane of [".outline", ".inspector", ".command-menu", ".help-overlay"]) {
    assert.ok(
      new RegExp(`:where\\([^)]*\\${pane}[,)]`).test(app),
      `${pane} is not in the scrollbar selector list`,
    );
  }
  // Focus is a ring on the field, not the UA outline, and it reaches the inspector.
  assert.match(app, /\.inspector input:not\(\[type="checkbox"\]\):focus-visible/);
  assert.match(app, /box-shadow: 0 0 0 3px var\(--accent-soft\)/);
  assert.match(app, /@media \(forced-colors: active\)/);
});

test("the chrome keeps no raw hex colours outside the token sheet", async () => {
  const { app } = await sheets();
  const hex = [...app.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((match) => match[0]);
  assert.deepEqual(hex, [], "move these into tokens.css");
});

test("no text-bearing rule crowds its content against the border", async () => {
  const { app } = await sheets();
  const space: Record<string, number> = {
    "--space-1": 4,
    "--space-2": 8,
    "--space-3": 12,
    "--space-4": 16,
    "--space-5": 24,
    "--space-6": 32,
  };
  const px = (value: string): number | null => {
    const token = /^var\((--[a-z0-9-]+)\)$/.exec(value.trim());
    if (token) return space[token[1] ?? ""] ?? null;
    const raw = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
    return raw ? Number(raw[1]) : null;
  };
  // Rules whose content is an icon, a chevron or a hit target, not a line of text.
  const EXEMPT =
    /\.kind-icon|\.outline-chevron|\.pane-resizer|\.react-flow|\.label-input|\.node-card\b|\.modal-close|\.recent-forget|\.canvas-error \.text-btn|\.walk-actions|\.icon-btn|\.brand-caret|\.ui-select-caret|\.template-tab|\.viewport-bar|\.zoom-readout|\.template-preview|\.canvas-empty-hints dt/;
  const offenders: string[] = [];
  for (const match of app.matchAll(/(^|\n)([^{@}\n][^{}]*)\{([^}]*)\}/g)) {
    const selector = (match[2] ?? "").trim().replaceAll(/\s+/g, " ");
    const body = match[3] ?? "";
    if (EXEMPT.test(selector)) continue;
    if (!/font-size|color:|content:/.test(body)) continue;
    const padding = /(?:^|;|\n)\s*padding:\s*([^;]+);/.exec(body)?.[1];
    if (!padding) continue;
    const parts = padding.trim().split(/\s+(?![^(]*\))/);
    if (parts.length === 0) continue;
    const inline = parts.length === 1 ? parts[0] : parts.length === 2 ? parts[1] : (parts[3] ?? parts[1]);
    const value = px(inline ?? "");
    if (value !== null && value < 10) offenders.push(`${selector} -> ${padding.trim()}`);
  }
  assert.deepEqual(offenders, [], "text sits too close to its border");
});
