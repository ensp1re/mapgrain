import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { FAILING_ARGV, MISSING_ARGV, makeFixture, runHarness, sampleTask } from "./helpers.ts";

test("empty verification cannot pass", async () => {
  const root = await makeFixture({
    tasks: [sampleTask({ state: "active", verification: [] })],
  });
  const result = await runHarness(root, ["verify", "F001"]);
  assert.equal(result.exitCode, 1);
  const tasks = JSON.parse(await readFile(path.join(root, "docs/harness/tasks.json"), "utf8")) as {
    tasks: Array<{ state: string }>;
  };
  assert.equal(tasks.tasks[0]?.state, "active");
});

test("missing executable and failing checks stay unverified", async () => {
  const missing = await makeFixture({
    checks: [{ id: "unit", argv: MISSING_ARGV, cwd: ".", timeoutSeconds: 5, required: true }],
    tasks: [sampleTask({ state: "active" })],
  });
  const missingResult = await runHarness(missing, ["verify", "F001"]);
  assert.equal(missingResult.exitCode, 1);

  const failing = await makeFixture({
    checks: [{ id: "unit", argv: FAILING_ARGV, cwd: ".", timeoutSeconds: 5, required: true }],
    tasks: [sampleTask({ state: "active" })],
  });
  const failingResult = await runHarness(failing, ["verify", "F001"]);
  assert.equal(failingResult.exitCode, 1);
});

test("timeouts fail distinctly", async () => {
  const root = await makeFixture({
    checks: [
      {
        id: "unit",
        argv: [process.execPath, "-e", "setTimeout(() => {}, 20_000)"],
        cwd: ".",
        timeoutSeconds: 1,
        required: true,
      },
    ],
    tasks: [sampleTask({ state: "active" })],
  });
  const result = await runHarness(root, ["verify", "F001"]);
  assert.equal(result.exitCode, 1);
  assert.match(JSON.stringify(result.payload.checks), /timeout/);
});

test("successful verify then input drift is stale", async () => {
  const root = await makeFixture({
    tasks: [sampleTask({ state: "active" })],
  });
  const verified = await runHarness(root, ["verify", "F001"]);
  assert.equal(verified.exitCode, 0);
  assert.equal(verified.payload.taskState, "verified");
  await writeFile(path.join(root, "src/index.ts"), "export const ok = false;\n");
  const validate = await runHarness(root, ["validate"]);
  assert.equal(validate.exitCode, 1);
  assert.match(JSON.stringify(validate.payload.errors), /stale/);
});

test("acceptance changes invalidate verified evidence", async () => {
  const root = await makeFixture({
    tasks: [sampleTask({ state: "active" })],
  });
  assert.equal((await runHarness(root, ["verify", "F001"])).exitCode, 0);
  const tasksPath = path.join(root, "docs/harness/tasks.json");
  const tasks = JSON.parse(await readFile(tasksPath, "utf8")) as {
    tasks: Array<{ acceptance: string[] }>;
  };
  tasks.tasks[0]?.acceptance.push("A new requirement");
  await writeFile(tasksPath, `${JSON.stringify(tasks, null, 2)}\n`);
  const validate = await runHarness(root, ["validate"]);
  assert.equal(validate.exitCode, 1);
});

test("config changes invalidate verified evidence", async () => {
  const root = await makeFixture({
    tasks: [sampleTask({ state: "active" })],
  });
  assert.equal((await runHarness(root, ["verify", "F001"])).exitCode, 0);
  const configPath = path.join(root, "docs/harness/config.json");
  const config = JSON.parse(await readFile(configPath, "utf8")) as {
    checks: Array<{ timeoutSeconds: number }>;
  };
  const first = config.checks[0];
  assert.ok(first);
  first.timeoutSeconds += 1;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const validate = await runHarness(root, ["validate"]);
  assert.equal(validate.exitCode, 1);
});

test("mutation during verification fails", async () => {
  const root = await makeFixture({
    checks: [
      {
        id: "unit",
        argv: [
          process.execPath,
          "-e",
          "require('fs').writeFileSync('src/index.ts', 'export const mutated = true\\n')",
        ],
        cwd: ".",
        timeoutSeconds: 10,
        required: true,
      },
    ],
    tasks: [sampleTask({ state: "active" })],
  });
  const result = await runHarness(root, ["verify", "F001"]);
  assert.equal(result.exitCode, 1);
  assert.equal(result.payload.taskState, "active");
});

test("archive requires passing and preserves archived dependencies", async () => {
  const root = await makeFixture({
    nextId: 3,
    tasks: [sampleTask(), sampleTask({ id: "F002", dependsOn: ["F001"], behavior: "child" })],
  });
  assert.equal((await runHarness(root, ["transition", "F001", "active"])).exitCode, 0);
  assert.equal((await runHarness(root, ["verify", "F001"])).exitCode, 0);
  const tasksPath = path.join(root, "docs/harness/tasks.json");
  const tasks = JSON.parse(await readFile(tasksPath, "utf8")) as {
    tasks: Array<{ state: string }>;
  };
  const first = tasks.tasks[0];
  assert.ok(first);
  first.state = "passing";
  await writeFile(tasksPath, `${JSON.stringify(tasks, null, 2)}\n`);
  const dry = await runHarness(root, ["archive", "F001", "--dry-run"]);
  assert.equal(dry.exitCode, 0);
  const archived = await runHarness(root, ["archive", "F001"]);
  assert.equal(archived.exitCode, 0);
  const activate = await runHarness(root, ["transition", "F002", "active"]);
  assert.equal(activate.exitCode, 0);
});

test("deliver dry-run reports missing remote without publishing", async () => {
  const root = await makeFixture({
    withGit: true,
    tasks: [
      sampleTask({
        state: "verified",
        evidence: {
          status: "passed",
          attemptId: "run-test",
          fingerprintBefore: "pending",
          fingerprintAfter: "pending",
        },
      }),
    ],
  });
  await runHarness(root, ["transition", "F001", "active"]);
  const verified = await runHarness(root, ["verify", "F001"]);
  assert.equal(verified.exitCode, 0);
  const dry = await runHarness(root, ["deliver", "F001", "--dry-run"]);
  assert.equal(dry.exitCode, 0);
  assert.equal(dry.payload.dryRun, true);
  assert.ok(Array.isArray(dry.payload.proposedActions));
});

test("concurrent writers fail clearly", async () => {
  const root = await makeFixture();
  await mkdir(path.join(root, "docs/harness"), { recursive: true });
  await writeFile(
    path.join(root, "docs/harness/state.lock"),
    `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`,
  );
  const result = await runHarness(root, ["transition", "F001", "active"]);
  assert.equal(result.exitCode, 1);
  assert.match(String(result.payload.error), /locked/);
});
