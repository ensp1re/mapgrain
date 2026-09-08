import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { runCli } from "./run.ts";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

void runCli(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  readFile: (file) => readFile(file, "utf8"),
  writeFile: (file, bytes) => writeFile(file, bytes),
  rename: (from, to) => rename(from, to),
  unlink: (file) => unlink(file).catch(() => undefined),
  stdin: readStdin,
  exists: async (file) => {
    try {
      await access(file);
      return true;
    } catch {
      return false;
    }
  },
}).then((code) => {
  process.exitCode = code;
});
