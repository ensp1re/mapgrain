import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("committed browser interaction results include 10/100-node fixtures, device, and p50/p95", async () => {
  const stored = fileURLToPath(new URL("../../../docs/perf/browser.json", import.meta.url));
  const report = JSON.parse(await readFile(stored, "utf8")) as {
    paint?: string;
    runtime: { device: string };
    browser: { name: string; headless: boolean; userAgent: string };
    fixtures: Array<{
      name: string;
      nodes: number;
      cold: { selectMs: number; typeMs: number };
      warm: { p50: { selectMs: number; typeMs: number }; p95: { selectMs: number; typeMs: number } };
    }>;
  };
  assert.ok(report.runtime.device);
  assert.equal(report.browser.name, "chromium");
  assert.equal(report.browser.headless, true);
  assert.ok(report.browser.userAgent.length > 0);
  assert.doesNotMatch(report.browser.userAgent, /pending-measurement/);
  assert.deepEqual(
    report.fixtures.map((item) => item.nodes),
    [10, 100],
  );
  for (const fixture of report.fixtures) {
    assert.ok(fixture.warm.p95.selectMs >= fixture.warm.p50.selectMs);
    assert.ok(fixture.warm.p95.typeMs >= fixture.warm.p50.typeMs);
    assert.ok(fixture.cold.selectMs >= 0);
    assert.ok(fixture.cold.typeMs >= 0);
  }
});

test("selection measurement is next-paint with a published 100-node budget", async () => {
  const interact = await readFile(
    fileURLToPath(new URL("./browser/interact.test.ts", import.meta.url)),
    "utf8",
  );
  const journey = await readFile(
    fileURLToPath(new URL("./browser/journey.test.ts", import.meta.url)),
    "utf8",
  );
  assert.match(interact, /requestAnimationFrame/);
  assert.match(interact, /SELECT_P95_BUDGET_MS/);
  assert.match(interact, /PAINT_MEASURE/);
  assert.doesNotMatch(interact, /force: true/);
  assert.match(journey, /New blank diagram/);
  assert.match(journey, /reimport/);
  assert.match(journey, /diagram.json/);
});
