#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { runCli } from "./run.ts";

void runCli(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  readFile: (file) => readFile(file, "utf8"),
  writeFile: (file, bytes) => writeFile(file, bytes),
}).then((code) => {
  process.exitCode = code;
});
