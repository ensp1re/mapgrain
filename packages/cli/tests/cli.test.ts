import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { EXIT_CODE, MAX_INPUT_BYTES } from "../src/constants/cli.ts";
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
    async rename(from: string, to: string) {
      const value = files[from];
      if (value === undefined) throw new Error(`ENOENT: ${from}`);
      files[to] = value;
      delete files[from];
    },
    async exists(path: string) {
      return Object.hasOwn(files, path);
    },
    async stdin() {
      const value = files["-"];
      if (value === undefined) throw new Error("stdin is empty");
      return value;
    },
    stdoutChunks,
    stderrChunks,
    files,
  };
}

function text(chunks: Array<string | Uint8Array>): string {
  return chunks.map((chunk) => (typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk))).join("");
}

test("numeric JSON is not treated as a successful exit code", async () => {
  const io = memoryIo({ "zero.json": "0" });
  const code = await runCli(["validate", "zero.json"], io);
  assert.equal(code, EXIT_CODE.ERROR);
  const diagnostic = JSON.parse(text(io.stderrChunks)) as { ok: boolean };
  assert.equal(diagnostic.ok, false);
});

test("failed temp write leaves the previous output file", async () => {
  const files: Record<string, string> = { "out.svg": "old" };
  const io = {
    ...memoryIo(files),
    files,
    async writeFile(path: string, bytes: Uint8Array) {
      if (path.endsWith(".tmp")) throw new Error("disk full");
      files[path] = Buffer.from(bytes).toString("binary");
    },
  };
  const source = await readFile(fixture, "utf8");
  files["nested-groups.json"] = source;
  const code = await runCli(["render", "nested-groups.json", "-o", "out.svg"], io);
  assert.equal(code, EXIT_CODE.ERROR);
  assert.equal(files["out.svg"], "old");
});

test("failed unique temp rename leaves destination and removes the temp file", async () => {
  const files: Record<string, string> = { "out.svg": "old" };
  const io = {
    ...memoryIo(files),
    files,
    async rename() {
      throw new Error("rename failed");
    },
    async unlink(path: string) {
      delete files[path];
    },
  };
  const source = await readFile(fixture, "utf8");
  files["nested-groups.json"] = source;
  const code = await runCli(["render", "nested-groups.json", "-o", "out.svg"], io);
  assert.equal(code, EXIT_CODE.ERROR);
  assert.equal(files["out.svg"], "old");
  assert.equal(
    Object.keys(files).some((path) => path.endsWith(".tmp")),
    false,
  );
});

test("two CLI writers use distinct temp paths", async () => {
  const source = await readFile(fixture, "utf8");
  const files: Record<string, string> = { "nested-groups.json": source };
  const temps: string[] = [];
  const io = {
    ...memoryIo(files),
    files,
    async writeFile(path: string, bytes: Uint8Array) {
      if (path.endsWith(".tmp")) temps.push(path);
      files[path] = Buffer.from(bytes).toString("binary");
    },
  };
  const first = await runCli(["export", "nested-groups.json", "--format", "svg", "-o", "a.svg"], io);
  const second = await runCli(["export", "nested-groups.json", "--format", "svg", "-o", "b.svg"], io);
  assert.equal(first, EXIT_CODE.OK);
  assert.equal(second, EXIT_CODE.OK);
  assert.equal(temps.length, 2);
  assert.notEqual(temps[0], temps[1]);
});

test("invalid input exits non-zero with a structured diagnostic", async () => {
  const io = memoryIo({ "bad.json": "{" });
  const code = await runCli(["validate", "bad.json"], io);
  assert.equal(code, EXIT_CODE.ERROR);
  const diagnostic = JSON.parse(text(io.stderrChunks)) as { ok: boolean; errors: Array<{ code: string; message: string }> };
  assert.equal(diagnostic.ok, false);
  assert.ok(diagnostic.errors[0]?.code);
  assert.ok(diagnostic.errors[0]?.message);
});

test("help exits 0 and lists commands", async () => {
  const io = memoryIo();
  const code = await runCli([], io);
  assert.equal(code, EXIT_CODE.OK);
  const body = text(io.stdoutChunks);
  assert.match(body, /validate/);
  assert.match(body, /studio/);
  assert.match(body, /doctor/);
  assert.match(body, /layout/);
  assert.match(body, /diagnose/);
  assert.match(body, /compare/);
  assert.match(body, /watch/);
});

test("diagnose reports geometry issues as JSON", async () => {
  const source = await readFile(fixture, "utf8");
  const io = memoryIo({ "nested-groups.json": source });
  const code = await runCli(["diagnose", "nested-groups.json"], io);
  assert.equal(code, EXIT_CODE.OK, text(io.stderrChunks));
  const result = JSON.parse(text(io.stdoutChunks)) as { ok: boolean; issues: unknown[] };
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.issues));
});

test("compare reports a removed node between two documents", async () => {
  const source = await readFile(fixture, "utf8");
  const left = JSON.parse(source) as { nodes: Array<{ id: string }>; edges: Array<{ source: { nodeId: string }; target: { nodeId: string } }> };
  const right = structuredClone(left);
  right.nodes = right.nodes.filter((node) => node.id !== "provider");
  right.edges = right.edges.filter((edge) => edge.source.nodeId !== "provider" && edge.target.nodeId !== "provider");
  const io = memoryIo({
    "before.json": JSON.stringify(left),
    "after.json": JSON.stringify(right),
  });
  const code = await runCli(["compare", "before.json", "after.json"], io);
  assert.equal(code, EXIT_CODE.OK, text(io.stderrChunks));
  const result = JSON.parse(text(io.stdoutChunks)) as { removedNodeIds: string[] };
  assert.deepEqual(result.removedNodeIds, ["provider"]);
});

test("unknown command exits 2 with a structured diagnostic", async () => {
  const io = memoryIo();
  const code = await runCli(["nope"], io);
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

test("validate and export succeed on sequence, data-flow, and lifecycle fixtures", async () => {
  const names = ["sequence-checkout.json", "data-flow-ingest.json", "lifecycle-session.json"] as const;
  for (const name of names) {
    const source = await readFile(
      fileURLToPath(new URL(`../../../tests/fixtures/documents/${name}`, import.meta.url)),
      "utf8",
    );
    const io = memoryIo({ [name]: source });
    const code = await runCli(["validate", name], io);
    assert.equal(code, EXIT_CODE.OK, `${name} ${text(io.stderrChunks)}`);
  }
});

test("render and export match the canonical scene for a fixture", async () => {
  const source = await readFile(fixture, "utf8");
  const io = memoryIo({ "nested-groups.json": source });
  const code = await runCli(["render", "nested-groups.json"], io);
  assert.equal(code, EXIT_CODE.OK);
  const rendered = text(io.stdoutChunks);
  assert.match(rendered, /<svg/);
  assert.match(rendered, /Workspace API/);
  assert.match(rendered, /Canonical renderer/);

  const exportIo = memoryIo({ "nested-groups.json": source });
  const exportCode = await runCli(
    ["export", "nested-groups.json", "--format", "svg", "-o", "out.svg"],
    exportIo,
  );
  assert.equal(exportCode, EXIT_CODE.OK);
  assert.match(exportIo.files["out.svg"] ?? "", /Workspace API/);
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

test("export html writes the same interactive viewer as view", async () => {
  const source = await readFile(fixture, "utf8");
  const viewIo = memoryIo({ "nested-groups.json": source });
  const exportIo = memoryIo({ "nested-groups.json": source });
  const viewCode = await runCli(["view", "nested-groups.json", "-o", "view.html"], viewIo);
  const exportCode = await runCli(
    ["export", "nested-groups.json", "--format", "html", "-o", "out.html"],
    exportIo,
  );
  assert.equal(viewCode, EXIT_CODE.OK);
  assert.equal(exportCode, EXIT_CODE.OK);
  assert.equal(exportIo.files["out.html"], viewIo.files["view.html"]);
  assert.match(exportIo.files["out.html"] ?? "", /Math\.min\(availW \/ size\.w, availH \/ size\.h\)/);
  assert.match(exportIo.files["out.html"] ?? "", /--mg-bg:/);
});

test("the CLI package is public, bundled, and does not depend on the editor", async () => {
  const manifest = JSON.parse(await readFile(pkg, "utf8")) as {
    name: string;
    bin: Record<string, string>;
    files: string[];
    exports?: unknown;
    dependencies: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(manifest.name, "mapgrain");
  assert.equal(manifest.bin.mapgrain, "./dist/mapgrain.js");
  assert.ok(manifest.files.includes("dist"));
  assert.ok(manifest.files.includes("schema"));
  assert.ok(manifest.files.includes("fonts"));
  assert.equal(manifest.exports, undefined);
  assert.equal(Object.hasOwn(manifest.dependencies, "@mapgrain/editor"), false);
  assert.equal(Object.hasOwn(manifest.devDependencies ?? {}, "@mapgrain/editor"), false);
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

test("two spawned CLI writers do not share a temp file or corrupt the destination", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mapgrain-cli-race-"));
  const out = join(dir, "out.svg");
  const run = (): Promise<number> =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["--experimental-strip-types", cliEntry, "render", fixture, "-o", out], {
        cwd: dir,
        env: { ...process.env },
      });
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 1));
    });
  const [left, right] = await Promise.all([run(), run()]);
  assert.equal(left, EXIT_CODE.OK);
  assert.equal(right, EXIT_CODE.OK);
  const svg = await readFile(out, "utf8");
  assert.match(svg, /<svg/);
  assert.match(svg, /Workspace API/);
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

test("version prints the package version", async () => {
  const io = memoryIo();
  const code = await runCli(["--version"], io);
  assert.equal(code, EXIT_CODE.OK);
  assert.match(text(io.stdoutChunks), /^0\.1\.0\n$/);
});

test("validate reads stdin", async () => {
  const source = await readFile(fixture, "utf8");
  const io = memoryIo({ "-": source });
  const code = await runCli(["validate", "-"], io);
  assert.equal(code, EXIT_CODE.OK);
  const result = JSON.parse(text(io.stdoutChunks)) as { ok: boolean; id: string };
  assert.equal(result.id, "doc-nested-groups");
});

test("no-clobber leaves an existing output file", async () => {
  const source = await readFile(fixture, "utf8");
  const io = memoryIo({ "nested-groups.json": source, "out.svg": "old" });
  const code = await runCli(["render", "nested-groups.json", "-o", "out.svg", "--no-clobber"], io);
  assert.equal(code, EXIT_CODE.ERROR);
  assert.equal(io.files["out.svg"], "old");
});

test("oversized input is rejected", async () => {
  const io = memoryIo({ "big.json": `{"x":"${"a".repeat(MAX_INPUT_BYTES)}}` });
  const code = await runCli(["validate", "big.json"], io);
  assert.equal(code, EXIT_CODE.ERROR);
  const diagnostic = JSON.parse(text(io.stderrChunks)) as { errors: Array<{ code: string }> };
  assert.equal(diagnostic.errors[0]?.code, "too_large");
});

test("paths with spaces and non-ASCII characters validate", async () => {
  const source = await readFile(fixture, "utf8");
  const name = "nested groups/диаграмма.json";
  const io = memoryIo({ [name]: source });
  const code = await runCli(["validate", name], io);
  assert.equal(code, EXIT_CODE.OK);
});

test("doctor reports runtime, assets, worker, renderer, and output", async () => {
  const io = memoryIo();
  const code = await runCli(["doctor"], io);
  assert.equal(code, EXIT_CODE.OK);
  const report = JSON.parse(text(io.stdoutChunks)) as { ok: boolean; checks: Array<{ id: string; ok: boolean }> };
  assert.equal(report.ok, true);
  const ids = report.checks.map((check) => check.id).sort();
  assert.deepEqual(ids, ["assets", "output", "renderer", "runtime", "worker"]);
});
