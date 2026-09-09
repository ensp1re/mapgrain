import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { EXIT_CODE } from "../src/constants/cli.ts";

const enabled = process.env.MAPGRAIN_PACK_TEST === "1";
const cliRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));
const fixture = join(fixtures, "nested-groups.json");
const modeFixtures = [
  "nested-groups.json",
  "workflow-decision.json",
  "sequence-checkout.json",
  "data-flow-ingest.json",
  "lifecycle-session.json",
] as const;

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

test(
  "packed tarball installs in an empty directory and runs help, validate, render, png, html, and studio",
  { skip: !enabled, timeout: 120_000 },
  async () => {
    const packDir = await mkdtemp(join(tmpdir(), "mapgrain-pack-"));
    const installDir = await mkdtemp(join(tmpdir(), "mapgrain-install-"));
    try {
      const packed = await run("pnpm", ["pack", "--pack-destination", packDir], cliRoot);
      assert.equal(packed.code, 0, packed.stderr);
      const tarball = (await readdir(packDir)).find((name) => name.endsWith(".tgz"));
      assert.ok(tarball);
      const installed = await run("npm", ["install", "--omit=dev", join(packDir, tarball)], installDir);
      assert.equal(installed.code, 0, installed.stderr);
      const bin = join(installDir, "node_modules", ".bin", "mapgrain");
      const help = await run(bin, ["--help"], installDir);
      assert.equal(help.code, EXIT_CODE.OK);
      assert.match(help.stdout, /studio/);
      const version = await run(bin, ["--version"], installDir);
      assert.match(version.stdout, /0\.2\.1/);
      const validate = await run(bin, ["validate", fixture], installDir);
      assert.equal(validate.code, EXIT_CODE.OK, validate.stderr);
      for (const name of modeFixtures) {
        const path = join(fixtures, name);
        const result = await run(bin, ["validate", path], installDir);
        assert.equal(result.code, EXIT_CODE.OK, `${name}: ${result.stderr}`);
      }
      const sequence = join(fixtures, "sequence-checkout.json");
      const sequenceHtml = join(installDir, "sequence.html");
      const viewed = await run(bin, ["view", sequence, "-o", sequenceHtml], installDir);
      assert.equal(viewed.code, EXIT_CODE.OK, viewed.stderr);
      const sequenceBody = await readFile(sequenceHtml, "utf8");
      assert.match(sequenceBody, /data-kind="lifeline"/);
      assert.match(sequenceBody, /data-kind="fragment"/);
      const svg = join(installDir, "diagram.svg");
      const png = join(installDir, "diagram.png");
      const html = join(installDir, "diagram.html");
      const render = await run(bin, ["render", fixture, "-o", svg], installDir);
      assert.equal(render.code, EXIT_CODE.OK, render.stderr);
      const exportPng = await run(bin, ["export", fixture, "--format", "png", "-o", png], installDir);
      assert.equal(exportPng.code, EXIT_CODE.OK, exportPng.stderr);
      const exportHtml = await run(bin, ["export", fixture, "--format", "html", "-o", html], installDir);
      assert.equal(exportHtml.code, EXIT_CODE.OK, exportHtml.stderr);
      const laid = join(installDir, "laid.json");
      const layout = await run(bin, ["layout", fixture, "-o", laid], installDir);
      assert.equal(layout.code, EXIT_CODE.OK, layout.stderr);
      const spaced = await mkdtemp(join(tmpdir(), "map grain диаграмма "));
      const copy = join(spaced, "nested groups.json");
      await copyFile(fixture, copy);
      const unicode = await run(bin, ["validate", copy], installDir);
      assert.equal(unicode.code, EXIT_CODE.OK, unicode.stderr);
      const studio = spawn(bin, ["studio", fixture], {
        cwd: installDir,
        env: { ...process.env, MAPGRAIN_STUDIO_NO_OPEN: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      const line = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("studio did not start")), 15_000);
        studio.stdout.on("data", (chunk: Buffer) => {
          clearTimeout(timer);
          resolve(chunk.toString("utf8"));
        });
        studio.stderr.on("data", (chunk: Buffer) => {
          clearTimeout(timer);
          reject(new Error(chunk.toString("utf8")));
        });
        studio.on("error", reject);
      });
      const started = JSON.parse(line) as { ok: boolean; url: string };
      assert.equal(started.ok, true);
      const page = await fetch(started.url);
      assert.equal(page.status, 200);
      studio.kill("SIGTERM");
      await new Promise((resolve) => studio.on("close", resolve));
    } finally {
      await rm(packDir, { recursive: true, force: true });
      await rm(installDir, { recursive: true, force: true });
    }
  },
);
