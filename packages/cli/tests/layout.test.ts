import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { OPERATION_KIND, applyOperationAt, validateDocument } from "@mapgrain/document";
import { EXIT_CODE } from "../src/constants/cli.ts";
import { ensureLaidOut } from "../src/layout.ts";
import { runCli } from "../src/run.ts";

const branching = fileURLToPath(
  new URL("../../../skills/mapgrain/examples/branching.json", import.meta.url),
);

function memoryIo(files: Record<string, string> = {}) {
  const stdoutChunks: Array<string | Uint8Array> = [];
  const stderrChunks: Array<string | Uint8Array> = [];
  return {
    stdout: { write(chunk: string | Uint8Array) { stdoutChunks.push(chunk); } },
    stderr: { write(chunk: string | Uint8Array) { stderrChunks.push(chunk); } },
    async readFile(path: string) {
      const value = files[path];
      if (value === undefined) throw new Error(`ENOENT: ${path}`);
      return value;
    },
    async writeFile(path: string, bytes: Uint8Array) {
      files[path] = Buffer.from(bytes).toString("utf8");
    },
    async rename(from: string, to: string) {
      const value = files[from];
      if (value === undefined) throw new Error(`ENOENT: ${from}`);
      files[to] = value;
      delete files[from];
    },
    stdoutChunks,
    files,
  };
}

test("layout fills positions for a branching map that has none", async () => {
  const raw = JSON.parse(await readFile(branching, "utf8")) as { layout?: unknown; nodes: unknown[] };
  assert.equal(raw.layout, undefined);
  const laid = await ensureLaidOut(raw);
  assert.equal(laid.ok, true);
  if (!laid.ok) return;
  assert.equal(Object.keys(laid.document.layout?.positions ?? {}).length, raw.nodes.length);
  const again = await ensureLaidOut(laid.document);
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.deepEqual(again.document.layout?.positions, laid.document.layout?.positions);
});

test("layout CLI writes positions and a later rename keeps them", async () => {
  const source = await readFile(branching, "utf8");
  const io = memoryIo({ "harbor.json": source });
  const code = await runCli(["layout", "harbor.json", "-o", "laid.json"], io);
  assert.equal(code, EXIT_CODE.OK);
  const laid = JSON.parse(io.files["laid.json"] ?? "null") as unknown;
  const validated = validateDocument(laid);
  assert.equal(validated.ok, true);
  if (!validated.ok) return;
  assert.equal(validated.document.nodes.length, 10);
  const desk = validated.document.layout?.positions.desk;
  assert.ok(desk);
  const renamed = applyOperationAt(
    validated.document,
    { kind: OPERATION_KIND.SET_NODE_LABEL, nodeId: "desk", label: "Harbor desk" },
    validated.document.revision,
  );
  assert.equal(renamed.ok, true);
  if (!renamed.ok) return;
  assert.equal(renamed.document.nodes.find((node) => node.id === "desk")?.label, "Harbor desk");
  assert.deepEqual(renamed.document.layout?.positions.desk, desk);
  assert.equal(renamed.document.nodes.length, 10);
});
