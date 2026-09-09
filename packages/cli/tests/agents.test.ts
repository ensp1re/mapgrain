import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mapgrain/document";
import {
  AGENT_INSTALL,
  HISTORICAL_CLI,
  PRIORITY_AGENTS,
  PUBLISHED_CLI,
  SHARED_PROJECT_SKILL_PATH,
  SKILL_NAME,
  SKILLS_CLI_VERSION,
  SOURCE_CLI_VERSION,
} from "../src/constants/agents.ts";
import { EXIT_CODE } from "../src/constants/cli.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const skillDir = path.join(root, "skills", "mapgrain");
const agentsDoc = path.join(root, "docs", "agents.md");
const schemaPkg = path.join(root, "packages", "document", "schema", "document.v1.json");
const schemaSkill = path.join(skillDir, "references", "document.schema.json");
const fixture = path.join(root, "tests", "fixtures", "documents", "nested-groups.json");
const branching = path.join(skillDir, "examples", "branching.json");

function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...env }, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      }),
    );
  });
}

test("priority installer ids and paths match skills 1.5.25 and the matrix", async () => {
  const skill = await readFile(path.join(skillDir, "SKILL.md"), "utf8");
  const matrix = await readFile(agentsDoc, "utf8");
  assert.equal(SKILLS_CLI_VERSION, "1.5.25");
  assert.equal(PUBLISHED_CLI, "mapgrain@0.2.1");
  assert.equal(HISTORICAL_CLI, "mapgrain@0.1.0");
  assert.equal(SOURCE_CLI_VERSION, "0.2.1");
  assert.equal(SHARED_PROJECT_SKILL_PATH, ".agents/skills/mapgrain");
  assert.equal(PRIORITY_AGENTS.length, 8);
  for (const agent of PRIORITY_AGENTS) {
    assert.match(skill, new RegExp(`--agent ${agent.id}`));
    assert.match(matrix, new RegExp(`\`${agent.id}\``));
    assert.match(matrix, new RegExp(agent.projectPath.replaceAll(".", "\\.")));
    assert.match(matrix, /untested/);
  }
  assert.equal(AGENT_INSTALL.CURSOR.projectPath, SHARED_PROJECT_SKILL_PATH);
  assert.equal(AGENT_INSTALL.CODEX.projectPath, SHARED_PROJECT_SKILL_PATH);
  assert.equal(AGENT_INSTALL.OPENCODE.projectPath, SHARED_PROJECT_SKILL_PATH);
  assert.equal(AGENT_INSTALL.GITHUB_COPILOT.projectPath, SHARED_PROJECT_SKILL_PATH);
  assert.equal(AGENT_INSTALL.GEMINI_CLI.projectPath, SHARED_PROJECT_SKILL_PATH);
  assert.match(matrix, /Installation success is not a live task pass/);
  assert.match(matrix, /does not ship a coordinator/);
});

test("skill schema matches the generated document contract", async () => {
  const skillSchema = JSON.parse(await readFile(schemaSkill, "utf8")) as unknown;
  const packageSchema = JSON.parse(await readFile(schemaPkg, "utf8")) as unknown;
  assert.deepEqual(skillSchema, packageSchema);
});

test("skills add copies mapgrain into the documented project paths", { timeout: 60_000 }, async () => {
  const dest = await mkdtemp(path.join(tmpdir(), "mapgrain-agents-"));
  const installed = await run(
    "npx",
    [
      "--yes",
      `skills@${SKILLS_CLI_VERSION}`,
      "add",
      root,
      "--skill",
      SKILL_NAME,
      "--yes",
      "--copy",
      "--agent",
      AGENT_INSTALL.CURSOR.id,
      "--agent",
      AGENT_INSTALL.CODEX.id,
      "--agent",
      AGENT_INSTALL.CLAUDE_CODE.id,
      "--agent",
      AGENT_INSTALL.OPENCODE.id,
      "--agent",
      AGENT_INSTALL.GITHUB_COPILOT.id,
      "--agent",
      AGENT_INSTALL.GROK.id,
      "--agent",
      AGENT_INSTALL.GEMINI_CLI.id,
      "--agent",
      AGENT_INSTALL.WINDSURF.id,
    ],
    dest,
  );
  assert.equal(installed.code, 0, installed.stderr || installed.stdout);
  const uniquePaths = [...new Set(PRIORITY_AGENTS.map((agent) => agent.projectPath))];
  for (const relative of uniquePaths) {
    const text = await readFile(path.join(dest, relative, "SKILL.md"), "utf8");
    assert.match(text, /name: mapgrain/);
    await readFile(path.join(dest, relative, "references", "document.schema.json"), "utf8");
    await readFile(path.join(dest, relative, "examples", "branching.json"), "utf8");
  }
});

test("npx mapgrain@0.1.0 still validates architecture in an empty directory", { timeout: 90_000 }, async () => {
  const dest = await mkdtemp(path.join(tmpdir(), "mapgrain-npx-"));
  const input = path.join(dest, "branching.json");
  await cp(branching, input);
  const version = await run("npx", ["--yes", HISTORICAL_CLI, "--version"], dest);
  assert.equal(version.code, EXIT_CODE.OK, version.stderr);
  assert.match(version.stdout, /0\.1\.0/);
  const validate = await run("npx", ["--yes", HISTORICAL_CLI, "validate", input], dest);
  assert.equal(validate.code, EXIT_CODE.OK, validate.stderr);
  const laid = path.join(dest, "laid.json");
  const layout = await run("npx", ["--yes", HISTORICAL_CLI, "layout", input, "-o", laid], dest);
  assert.equal(layout.code, EXIT_CODE.OK, layout.stderr);
  const laidRaw = JSON.parse(await readFile(laid, "utf8")) as { layout?: { positions?: Record<string, unknown> } };
  assert.ok(laidRaw.layout?.positions);
  const html = path.join(dest, "diagram.html");
  const view = await run("npx", ["--yes", HISTORICAL_CLI, "view", laid, "-o", html], dest);
  assert.equal(view.code, EXIT_CODE.OK, view.stderr);
  const body = await readFile(html, "utf8");
  assert.match(body, /Read-only view/);
});

test("npx mapgrain@0.2.0 still validates sequence in an empty directory", { timeout: 90_000 }, async () => {
  const dest = await mkdtemp(path.join(tmpdir(), "mapgrain-npx-seq-020-"));
  const sequence = path.join(root, "tests", "fixtures", "documents", "sequence-checkout.json");
  const input = path.join(dest, "sequence.json");
  await cp(sequence, input);
  const version = await run("npx", ["--yes", "mapgrain@0.2.0", "--version"], dest);
  assert.equal(version.code, EXIT_CODE.OK, version.stderr);
  assert.match(version.stdout, /0\.2\.0/);
  const validate = await run("npx", ["--yes", "mapgrain@0.2.0", "validate", input], dest);
  assert.equal(validate.code, EXIT_CODE.OK, validate.stderr);
  const html = path.join(dest, "sequence.html");
  const view = await run("npx", ["--yes", "mapgrain@0.2.0", "view", input, "-o", html], dest);
  assert.equal(view.code, EXIT_CODE.OK, view.stderr);
  const body = await readFile(html, "utf8");
  assert.match(body, /data-kind="lifeline"/);
});

test("npx mapgrain@0.2.1 validates sequence in an empty directory", { timeout: 90_000 }, async () => {
  const dest = await mkdtemp(path.join(tmpdir(), "mapgrain-npx-seq-"));
  const sequence = path.join(root, "tests", "fixtures", "documents", "sequence-checkout.json");
  const input = path.join(dest, "sequence.json");
  await cp(sequence, input);
  const version = await run("npx", ["--yes", PUBLISHED_CLI, "--version"], dest);
  assert.equal(version.code, EXIT_CODE.OK, version.stderr);
  assert.match(version.stdout, /0\.2\.1/);
  const validate = await run("npx", ["--yes", PUBLISHED_CLI, "validate", input], dest);
  assert.equal(validate.code, EXIT_CODE.OK, validate.stderr);
  const html = path.join(dest, "sequence.html");
  const view = await run("npx", ["--yes", PUBLISHED_CLI, "view", input, "-o", html], dest);
  assert.equal(view.code, EXIT_CODE.OK, view.stderr);
  const body = await readFile(html, "utf8");
  assert.match(body, /data-kind="lifeline"/);
});

test("two CLI writers in a clean directory keep separate files valid", { timeout: 90_000 }, async () => {
  const dest = await mkdtemp(path.join(tmpdir(), "mapgrain-writers-"));
  const left = path.join(dest, "left.json");
  const right = path.join(dest, "right.json");
  await cp(fixture, left);
  await cp(fixture, right);
  const [a, b] = await Promise.all([
    run("npx", ["--yes", PUBLISHED_CLI, "validate", left], dest),
    run("npx", ["--yes", PUBLISHED_CLI, "validate", right], dest),
  ]);
  assert.equal(a.code, EXIT_CODE.OK, a.stderr);
  assert.equal(b.code, EXIT_CODE.OK, b.stderr);
  const leftDoc = validateDocument(JSON.parse(await readFile(left, "utf8")));
  const rightDoc = validateDocument(JSON.parse(await readFile(right, "utf8")));
  assert.equal(leftDoc.ok, true);
  assert.equal(rightDoc.ok, true);
});

test("global grok install with an isolated home lands in ~/.grok/skills", { timeout: 60_000 }, async () => {
  const home = await mkdtemp(path.join(tmpdir(), "mapgrain-home-"));
  const dest = await mkdtemp(path.join(tmpdir(), "mapgrain-global-"));
  const installed = await run(
    "npx",
    [
      "--yes",
      `skills@${SKILLS_CLI_VERSION}`,
      "add",
      root,
      "--skill",
      SKILL_NAME,
      "--yes",
      "--copy",
      "-g",
      "--agent",
      AGENT_INSTALL.GROK.id,
    ],
    dest,
    { ...process.env, HOME: home },
  );
  assert.equal(installed.code, 0, installed.stderr || installed.stdout);
  const text = await readFile(path.join(home, ".grok", "skills", "mapgrain", "SKILL.md"), "utf8");
  assert.match(text, /name: mapgrain/);
});
