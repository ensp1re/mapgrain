import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { GENERATED_OUTPUT_PREFIXES } from "../constants/paths.ts";
import type { FingerprintResult, HarnessConfig, TaskStateFile } from "../types/records.ts";
import { HarnessError } from "./error.ts";
import { exists, safePath, sha256File } from "./fs.ts";

function isGeneratedPath(stored: string): boolean {
  return GENERATED_OUTPUT_PREFIXES.some(
    (prefix) => stored === prefix || stored.startsWith(`${prefix}/`),
  );
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

async function walkFiles(root: string, stored: string): Promise<Array<{ path: string; sha256: string }>> {
  const file = await safePath(root, stored, { allowMissing: true });
  if (!(await exists(file))) {
    throw new HarnessError(`fingerprint input is missing: ${stored}`, 1);
  }
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink()) {
    await safePath(root, stored, { allowMissing: false });
    return [{ path: stored, sha256: await sha256File(file) }];
  }
  if (stat.isFile()) return [{ path: stored, sha256: await sha256File(file) }];
  if (!stat.isDirectory()) {
    throw new HarnessError(`unsupported fingerprint input: ${stored}`, 1);
  }
  const names = (await fs.readdir(file)).sort();
  const records: Array<{ path: string; sha256: string }> = [];
  for (const name of names) {
    const child = `${stored}/${name}`;
    if (isGeneratedPath(child)) continue;
    records.push(...(await walkFiles(root, child)));
  }
  return records;
}

function taskProjection(tasks: TaskStateFile) {
  return tasks.tasks.map((task) => ({
    id: task.id,
    behavior: task.behavior,
    acceptance: task.acceptance,
    spec: task.spec,
    plan: task.plan,
    verification: task.verification,
  }));
}

export async function fingerprint(
  root: string,
  config: HarnessConfig,
  tasks: TaskStateFile,
): Promise<FingerprintResult> {
  const records: Array<{ path: string; sha256: string }> = [];
  for (const stored of config.fingerprintPaths) {
    records.push(...(await walkFiles(root, stored)));
  }
  records.sort((a, b) => a.path.localeCompare(b.path));
  const digest = createHash("sha256");
  for (const record of records) digest.update(`${record.path}\0${record.sha256}\n`);
  digest.update(stableStringify(config));
  digest.update(stableStringify(taskProjection(tasks)));
  return { digest: digest.digest("hex"), files: records };
}
