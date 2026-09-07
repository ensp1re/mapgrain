import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { measureDocuments } from "../src/measure.ts";

const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = join(cliRoot, "..", "..", "tests", "fixtures", "documents");
const outFile = join(cliRoot, "..", "..", "docs", "perf", "latest.json");

const names = ["nested-groups.json", "hundred-nodes.json"];
const fixtures = [];
for (const name of names) {
  fixtures.push({
    name,
    document: JSON.parse(await readFile(join(fixturesDir, name), "utf8")) as unknown,
  });
}

const report = await measureDocuments(fixtures);
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${outFile}\n`);
