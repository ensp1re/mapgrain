import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { HarnessError } from "./error.ts";

export async function realRoot(root: string): Promise<string> {
  const stat = await fs.stat(root).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new HarnessError(`root is not a directory: ${root}`);
  }
  return fs.realpath(root);
}

export function relativeStoredPath(value: string): string {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) {
    throw new HarnessError(`path must be a non-empty relative path: ${String(value)}`);
  }
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new HarnessError(`path escapes root: ${value}`);
  }
  return normalized;
}

async function statOrNull(file: string) {
  try {
    return await fs.lstat(file);
  } catch (error) {
    if (isErrno(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function safePath(
  root: string,
  stored: string,
  options: { allowMissing?: boolean } = {},
): Promise<string> {
  const relative = relativeStoredPath(stored);
  const candidate = path.resolve(root, relative);
  const rootPrefix = `${root}${path.sep}`;
  if (candidate !== root && !candidate.startsWith(rootPrefix)) {
    throw new HarnessError(`path escapes root: ${stored}`);
  }

  let probe = candidate;
  while (true) {
    const stat = await statOrNull(probe);
    if (stat) break;
    if (probe === root) break;
    probe = path.dirname(probe);
  }
  const resolvedProbe = await fs.realpath(probe);
  if (resolvedProbe !== root && !resolvedProbe.startsWith(rootPrefix)) {
    throw new HarnessError(`symlink escapes root: ${stored}`);
  }
  if (!options.allowMissing && !(await exists(candidate))) {
    throw new HarnessError(`missing path: ${stored}`);
  }
  return candidate;
}

export async function readJsonFile(
  root: string,
  stored: string,
  options: { allowMissing?: boolean } = {},
): Promise<unknown> {
  const file = await safePath(root, stored, { allowMissing: options.allowMissing ?? false });
  if (!(await exists(file))) {
    if (options.allowMissing) return null;
    throw new HarnessError(`missing path: ${stored}`);
  }
  let text: string;
  try {
    text = await fs.readFile(file, "utf8");
  } catch (error) {
    throw new HarnessError(
      `cannot read ${stored}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new HarnessError(
      `malformed JSON in ${stored}: ${error instanceof Error ? error.message : String(error)}`,
      1,
    );
  }
}

export async function atomicWrite(
  root: string,
  stored: string,
  value: unknown,
): Promise<void> {
  const file = await safePath(root, stored, { allowMissing: true });
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  const body = typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(temporary, body, "utf8");
  await fs.rename(temporary, file);
}

export async function sha256File(file: string): Promise<string> {
  const buffer = await fs.readFile(file);
  return createHash("sha256").update(buffer).digest("hex");
}

export function isErrno(error: unknown): error is NodeJS.ErrnoException {
  return error !== null && typeof error === "object" && "code" in error;
}
