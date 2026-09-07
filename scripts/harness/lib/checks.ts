import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { CHECK_RUN_STATUS } from "../constants/states.ts";
import type { CheckConfig, CheckRunStatus } from "../types/records.ts";
import { isErrno, safePath } from "./fs.ts";

export interface SpawnedCheck {
  id: string;
  argv: string[];
  cwd: string;
  status: CheckRunStatus;
  exitCode: number | null;
  logPath: string;
  stdout: string;
  stderr: string;
  error?: string;
}

export async function runCheck(
  root: string,
  check: CheckConfig,
  logFile: string,
): Promise<SpawnedCheck> {
  const cwd = await safePath(root, check.cwd);
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    let child: ReturnType<typeof spawn> | undefined;

    const finish = (status: CheckRunStatus, exitCode: number | null, error?: string) => {
      if (settled) return;
      settled = true;
      resolve({
        id: check.id,
        argv: check.argv,
        cwd: check.cwd,
        status,
        exitCode,
        logPath: logFile,
        stdout,
        stderr,
        error,
      });
    };

    const command = check.argv[0];
    if (!command) {
      finish(CHECK_RUN_STATUS.MISSING_EXECUTABLE, null, "check argv is empty");
      return;
    }

    try {
      child = spawn(command, check.argv.slice(1), {
        cwd,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      });
    } catch (error) {
      const missing = isErrno(error) && error.code === "ENOENT";
      finish(
        missing ? CHECK_RUN_STATUS.MISSING_EXECUTABLE : CHECK_RUN_STATUS.FAILED,
        null,
        error instanceof Error ? error.message : String(error),
      );
      return;
    }

    const spawned = child;
    spawned.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    spawned.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        if (child?.pid) process.kill(-child.pid, "SIGTERM");
      } catch {
        child?.kill("SIGTERM");
      }
      setTimeout(() => {
        try {
          if (child?.pid) process.kill(-child.pid, "SIGKILL");
        } catch {
          /* already gone */
        }
      }, 250);
    }, Math.max(1, check.timeoutSeconds) * 1000);

    spawned.once("error", (error) => {
      clearTimeout(timeout);
      const missing = isErrno(error) && error.code === "ENOENT";
      finish(
        missing ? CHECK_RUN_STATUS.MISSING_EXECUTABLE : CHECK_RUN_STATUS.FAILED,
        null,
        error.message,
      );
    });

    spawned.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (timedOut) {
        finish(CHECK_RUN_STATUS.TIMEOUT, code, "check timed out");
        return;
      }
      if (signal === "SIGTERM" || signal === "SIGKILL") {
        finish(CHECK_RUN_STATUS.INTERRUPTED, code, `signal ${signal}`);
        return;
      }
      if (code === 0) {
        finish(CHECK_RUN_STATUS.PASSED, code);
        return;
      }
      finish(
        CHECK_RUN_STATUS.FAILED,
        code,
        `exit ${code ?? "null"}${signal ? ` signal ${signal}` : ""}`,
      );
    });
  });
}

export async function appendLog(root: string, stored: string, chunk: string): Promise<void> {
  const file = await safePath(root, stored, { allowMissing: true });
  await fs.appendFile(file, chunk, "utf8");
}
