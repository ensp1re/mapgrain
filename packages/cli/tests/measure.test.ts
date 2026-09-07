import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { measureDocuments, percentile } from "../src/measure.ts";

const nested = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);

test("percentile is computed from sorted samples", () => {
  assert.equal(percentile([1, 2, 3, 4], 50), 2);
  assert.equal(percentile([1, 2, 3, 4], 95), 4);
});

test("performance results include device, fixture, warm/cold, and p50/p95", async () => {
  const document = JSON.parse(await readFile(nested, "utf8")) as unknown;
  const report = await measureDocuments([{ name: "nested-groups.json", document }]);
  assert.equal(typeof report.runtime.node, "string");
  assert.equal(typeof report.runtime.platform, "string");
  assert.equal(typeof report.runtime.arch, "string");
  assert.equal(typeof report.runtime.device, "string");
  assert.equal(report.browser, null);
  const fixture = report.fixtures[0];
  assert.equal(fixture?.name, "nested-groups.json");
  assert.ok(fixture && fixture.cold.layoutMs >= 0);
  assert.ok(fixture && fixture.warm.reps >= 1);
  assert.ok(fixture && fixture.warm.p50.layoutMs >= 0);
  assert.ok(fixture && fixture.warm.p95.layoutMs >= fixture.warm.p50.layoutMs);
});

test("committed perf results include both fixtures, device, and p50/p95", async () => {
  const stored = fileURLToPath(new URL("../../../docs/perf/latest.json", import.meta.url));
  const report = JSON.parse(await readFile(stored, "utf8")) as {
    runtime: { device: string; node: string };
    browser: null;
    fixtures: Array<{ name: string; cold: { layoutMs: number }; warm: { p50: { layoutMs: number }; p95: { layoutMs: number } } }>;
  };
  assert.equal(report.browser, null);
  assert.ok(report.runtime.device);
  assert.ok(report.runtime.node);
  assert.deepEqual(
    report.fixtures.map((item) => item.name),
    ["nested-groups.json", "hundred-nodes.json"],
  );
  for (const fixture of report.fixtures) {
    assert.ok(fixture.warm.p95.layoutMs >= fixture.warm.p50.layoutMs);
    assert.ok(fixture.cold.layoutMs >= 0);
  }
});
