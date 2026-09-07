import { promises as fs } from "node:fs";
import path from "node:path";
import { HARNESS_PATHS } from "../constants/paths.ts";
import { HarnessError } from "./error.ts";
import { isErrno, safePath } from "./fs.ts";

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readLockPid(lock: string): Promise<number | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(lock, "utf8")) as { pid?: unknown };
    return typeof parsed.pid === "number" ? parsed.pid : null;
  } catch {
    return null;
  }
}

export async function acquireLock(root: string): Promise<() => Promise<void>> {
  const lock = await safePath(root, HARNESS_PATHS.lock, { allowMissing: true });
  await fs.mkdir(path.dirname(lock), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await fs.open(lock, "wx");
      await handle.writeFile(
        `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`,
      );
      await handle.close();
      return async () => {
        await fs.unlink(lock).catch(() => undefined);
      };
    } catch (error) {
      if (!isErrno(error) || error.code !== "EEXIST") throw error;
      const pid = await readLockPid(lock);
      if (pid && isAlive(pid)) {
        throw new HarnessError("harness state is locked by another writer", 1);
      }
      await fs.unlink(lock).catch(() => undefined);
    }
  }
  throw new HarnessError("harness state is locked by another writer", 1);
}
