import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { makeFixture, runHarness, sampleTask } from "./helpers.ts";

test("usage error is invalid input", async () => {
  const root = await makeFixture();
  const result = await runHarness(root, []);
  assert.equal(result.exitCode, 2);
  assert.equal(result.payload.ok, false);
});

test("context and validate succeed on a clean queue", async () => {
  const root = await makeFixture();
  const context = await runHarness(root, ["context"]);
  assert.equal(context.exitCode, 0);
  assert.equal(context.payload.ok, true);
  assert.deepEqual(context.payload.readyTaskIds, ["F001"]);
  const validate = await runHarness(root, ["validate"]);
  assert.equal(validate.exitCode, 0);
  assert.equal(validate.payload.ok, true);
});

test("malformed tasks JSON is a failed check, not a stack trace", async () => {
  const root = await makeFixture();
  await writeFile(path.join(root, "docs/harness/tasks.json"), "{invalid");
  const result = await runHarness(root, ["validate"]);
  assert.ok(result.exitCode === 1 || result.exitCode === 2);
  assert.equal(result.payload.ok, false);
  assert.match(JSON.stringify(result.payload.errors), /malformed JSON/);
});

test("duplicate task ids fail validation", async () => {
  const root = await makeFixture({
    tasks: [sampleTask(), sampleTask({ id: "F001", behavior: "copy" })],
    nextId: 2,
  });
  const result = await runHarness(root, ["validate"]);
  assert.equal(result.exitCode, 1);
  assert.match(JSON.stringify(result.payload.errors), /duplicate task id/);
});

test("cycles and missing dependencies fail validation", async () => {
  const missing = await makeFixture({
    tasks: [sampleTask({ dependsOn: ["F999"] })],
  });
  const missingResult = await runHarness(missing, ["validate"]);
  assert.equal(missingResult.exitCode, 1);
  assert.match(JSON.stringify(missingResult.payload.errors), /missing task/);

  const cyclic = await makeFixture({
    nextId: 3,
    tasks: [
      sampleTask({ id: "F001", dependsOn: ["F002"] }),
      sampleTask({ id: "F002", dependsOn: ["F001"] }),
    ],
  });
  const cyclicResult = await runHarness(cyclic, ["validate"]);
  assert.equal(cyclicResult.exitCode, 1);
  assert.match(JSON.stringify(cyclicResult.payload.errors), /cycle/);
});

test("legal transitions and WIP limit", async () => {
  const root = await makeFixture({
    nextId: 3,
    tasks: [sampleTask(), sampleTask({ id: "F002", behavior: "second" })],
  });
  const active = await runHarness(root, ["transition", "F001", "active"]);
  assert.equal(active.exitCode, 0);
  const second = await runHarness(root, ["transition", "F002", "active"]);
  assert.equal(second.exitCode, 1);
  assert.match(String(second.payload.error), /WIP limit/);
  const blocked = await runHarness(root, [
    "transition",
    "F001",
    "blocked",
    "--reason",
    "waiting on review",
  ]);
  assert.equal(blocked.exitCode, 0);
  const resume = await runHarness(root, ["transition", "F001", "active"]);
  assert.equal(resume.exitCode, 0);
});

test("illegal transitions are rejected", async () => {
  const root = await makeFixture();
  const verified = await runHarness(root, ["transition", "F001", "verified"]);
  assert.equal(verified.exitCode, 1);
  const passing = await runHarness(root, ["transition", "F001", "passing"]);
  assert.equal(passing.exitCode, 1);
  const unknown = await runHarness(root, ["transition", "F001", "done"]);
  assert.equal(unknown.exitCode, 2);
});

test("unsatisfied dependencies cannot activate", async () => {
  const root = await makeFixture({
    nextId: 3,
    tasks: [
      sampleTask(),
      sampleTask({ id: "F002", dependsOn: ["F001"], behavior: "downstream" }),
    ],
  });
  const result = await runHarness(root, ["transition", "F002", "active"]);
  assert.equal(result.exitCode, 1);
  assert.match(String(result.payload.error), /unsatisfied dependencies/);
});

test("handoff preserves authored prose", async () => {
  const root = await makeFixture();
  const result = await runHarness(root, ["handoff"]);
  assert.equal(result.exitCode, 0);
  const handoff = JSON.parse(
    await readFile(path.join(root, "docs/harness/handoff.json"), "utf8"),
  ) as { decisions: string[]; rejectedApproaches: string[] };
  assert.deepEqual(handoff.decisions, ["keep this decision"]);
  assert.deepEqual(handoff.rejectedApproaches, ["abandoned approach"]);
});
