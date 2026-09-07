import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { EXPORT_FORMAT, exportDiagram } from "@mapgrain/renderer";
import { EXIT_CODE } from "../src/constants/cli.ts";
import { runCli } from "../src/run.ts";

const fixture = fileURLToPath(
  new URL("../../../tests/fixtures/documents/nested-groups.json", import.meta.url),
);
const hundred = fileURLToPath(
  new URL("../../../tests/fixtures/documents/hundred-nodes.json", import.meta.url),
);
const cliEntry = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const pkg = fileURLToPath(new URL("../package.json", import.meta.url));

function memoryIo(files: Record<string, string> = {}) {
  const stdoutChunks: Array<string | Uint8Array> = [];
  const stderrChunks: Array<string | Uint8Array> = [];
  return {
    stdout: {
      write(chunk: string | Uint8Array) {
        stdoutChunks.push(chunk);
      },
    },
    stderr: {
      write(chunk: string | Uint8Array) {
        stderrChunks.push(chunk);
      },
    },
    async readFile(path: string) {
      const value = files[path];
      if (value === undefined) throw new Error(`ENOENT: ${path}`);
      return value;
    },
    async writeFile(path: string, bytes: Uint8Array) {
      files[path] = Buffer.from(bytes).toString("binary");
    },
    stdoutChunks,
    stderrChunks,
    files,
  };
}

function text(chunks: Array<string | Uint8Array>): string {
  return chunks.map((chunk) => (typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk))).join("");
}

test("invalid input exits non-zero with a structured diagnostic", async () => {
  const io = memoryIo({ "bad.json": "{" });
  const code = await runCli(["validate", "bad.json"], io);
  assert.equal(code, EXIT_CODE.ERROR);
  const diagnostic = JSON.parse(text(io.stderrChunks)) as { ok: boolean; errors: Array<{ code: string; message: string }> };
  assert.equal(diagnostic.ok, false);
  assert.ok(diagnostic.errors[0]?.code);
  assert.ok(diagnostic.errors[0]?.message);
});

test("usage errors exit 2 with a structured diagnostic", async () => {
  const io = memoryIo();
  const code = await runCli([], io);
  assert.equal(code, EXIT_CODE.USAGE);
  const diagnostic = JSON.parse(text(io.stderrChunks)) as { ok: boolean };
  assert.equal(diagnostic.ok, false);
});

test("validate succeeds on a fixture", async () => {
  const source = await readFile(fixture, "utf8");
  const io = memoryIo({ "nested-groups.json": source });
  const code = await runCli(["validate", "nested-groups.json"], io);
  assert.equal(code, EXIT_CODE.OK);
  const result = JSON.parse(text(io.stdoutChunks)) as { ok: boolean; id: string; nodes: number };
  assert.equal(result.ok, true);
  assert.equal(result.id, "doc-nested-groups");
  assert.equal(result.nodes, 5);
});

test("render and export match the canonical scene for a fixture", async () => {
  const source = await readFile(fixture, "utf8");
  const io = memoryIo({ "nested-groups.json": source });
  const code = await runCli(["render", "nested-groups.json"], io);
  assert.equal(code, EXIT_CODE.OK);
  const rendered = text(io.stdoutChunks);
  const expected = exportDiagram({
    document: JSON.parse(source) as unknown,
    format: EXPORT_FORMAT.SVG,
  });
  assert.equal(expected.ok, true);
  if (!expected.ok) return;
  assert.equal(rendered, new TextDecoder().decode(expected.bytes));
  assert.match(rendered, /Workspace API/);

  const exportIo = memoryIo({ "nested-groups.json": source });
  const exportCode = await runCli(
    ["export", "nested-groups.json", "--format", "svg", "-o", "out.svg"],
    exportIo,
  );
  assert.equal(exportCode, EXIT_CODE.OK);
  assert.equal(exportIo.files["out.svg"], Buffer.from(expected.bytes).toString("binary"));
});

test("CLI export JSON preserves portable layout positions", async () => {
  const source = await readFile(fixture, "utf8");
  const document = JSON.parse(source) as Record<string, unknown>;
  document.layout = {
    version: 1,
    revision: 1,
    positions: { gateway: { x: -90, y: 30 } },
  };
  const io = memoryIo({ "laid-out.json": JSON.stringify(document) });
  const code = await runCli(["export", "laid-out.json", "--format", "json"], io);
  assert.equal(code, EXIT_CODE.OK);
  const exported = JSON.parse(text(io.stdoutChunks)) as { layout?: { positions?: { gateway?: { x: number } } } };
  assert.equal(exported.layout?.positions?.gateway?.x, -90);
});

test("view writes read-only HTML from the canonical scene", async () => {
  const source = await readFile(fixture, "utf8");
  const io = memoryIo({ "nested-groups.json": source });
  const code = await runCli(["view", "nested-groups.json", "-o", "view.html"], io);
  assert.equal(code, EXIT_CODE.OK);
  const html = io.files["view.html"] ?? "";
  assert.match(html, /Read-only view/);
  assert.match(html, /Workspace API/);
  assert.doesNotMatch(html, /Inspector/);
});

test("the CLI package does not depend on the editor", async () => {
  const manifest = JSON.parse(await readFile(pkg, "utf8")) as { dependencies: Record<string, string> };
  assert.equal(Object.hasOwn(manifest.dependencies, "@mapgrain/editor"), false);
  assert.equal(Object.hasOwn(manifest.dependencies, "react"), false);
});

test("CLI validates the hundred-node fixture", async () => {
  const source = await readFile(hundred, "utf8");
  const io = memoryIo({ "hundred-nodes.json": source });
  const code = await runCli(["validate", "hundred-nodes.json"], io);
  assert.equal(code, EXIT_CODE.OK);
  const result = JSON.parse(text(io.stdoutChunks)) as { ok: boolean; nodes: number };
  assert.equal(result.ok, true);
  assert.equal(result.nodes, 100);
});

test("spawned CLI validates a fixture without loading the editor", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-cli-"));
  const code: number = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--experimental-strip-types", cliEntry, "validate", fixture], {
      cwd: dir,
      env: { ...process.env },
    });
    child.on("error", reject);
    child.on("close", (exit) => resolve(exit ?? 1));
  });
  assert.equal(code, EXIT_CODE.OK);
});
