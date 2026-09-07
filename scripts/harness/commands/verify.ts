import { HARNESS_PATHS } from "../constants/paths.ts";
import { ATTEMPT_STATUS, CHECK_RUN_STATUS, SCHEMA_VERSION, TASK_STATE } from "../constants/states.ts";
import { appendLog, runCheck } from "../lib/checks.ts";
import { HarnessError } from "../lib/error.ts";
import { fingerprint } from "../lib/fingerprint.ts";
import { atomicWrite } from "../lib/fs.ts";
import { acquireLock } from "../lib/lock.ts";
import { checkMap, loadState, validateState } from "../lib/validate.ts";
import type { AttemptRecord, CommandResult } from "../types/records.ts";

export async function commandVerify(root: string, args: string[]): Promise<CommandResult> {
  const id = args[0];
  if (!id) throw new HarnessError("usage: verify ID");

  const release = await acquireLock(root);
  try {
    const state = await loadState(root);
    const validation = await validateState(root, state, { includeFreshness: false });
    if (validation.errors.length) {
      throw new HarnessError("state is invalid; verification refused", 1, validation.errors);
    }
    const task = state.tasks.tasks.find((item) => item.id === id);
    if (!task) throw new HarnessError(`unknown live task: ${id}`);
    if (task.state !== TASK_STATE.ACTIVE) {
      throw new HarnessError(`${id} must be active before verify`, 1);
    }

    const attemptId = `run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const attemptStored = `${HARNESS_PATHS.runs}/${attemptId}.json`;
    const logStored = `${HARNESS_PATHS.runs}/${attemptId}.log`;
    const attempt: AttemptRecord = {
      schemaVersion: SCHEMA_VERSION,
      id: attemptId,
      taskId: id,
      status: ATTEMPT_STATUS.RUNNING,
      startedAt: new Date().toISOString(),
      endedAt: null,
      fingerprintBefore: null,
      fingerprintAfter: null,
      checks: [],
      runtime: { node: process.versions.node },
      errors: [],
    };
    await atomicWrite(root, attemptStored, attempt);
    await atomicWrite(root, logStored, `attempt ${attemptId} started\n`);

    try {
      attempt.fingerprintBefore = (await fingerprint(root, state.config, state.tasks)).digest;
    } catch (error) {
      attempt.status = ATTEMPT_STATUS.FAILED;
      attempt.endedAt = new Date().toISOString();
      attempt.errors.push(error instanceof Error ? error.message : String(error));
      task.evidence = { status: "failed", attemptId, failure: { classification: "input_error" } };
      await atomicWrite(root, attemptStored, attempt);
      await atomicWrite(root, HARNESS_PATHS.tasks, state.tasks);
      return {
        payload: { ok: false, id, attemptId, status: attempt.status, errors: attempt.errors },
        exitCode: 1,
      };
    }

    if (task.verification.length === 0) {
      attempt.status = ATTEMPT_STATUS.FAILED;
      attempt.endedAt = new Date().toISOString();
      attempt.errors.push("empty verification cannot pass");
      task.evidence = {
        status: "failed",
        attemptId,
        failure: { classification: "empty_verification" },
      };
      await atomicWrite(root, attemptStored, attempt);
      await atomicWrite(root, HARNESS_PATHS.tasks, state.tasks);
      return {
        payload: { ok: false, id, attemptId, status: attempt.status, errors: attempt.errors },
        exitCode: 1,
      };
    }

    const checks = checkMap(state.config);
    for (const checkId of task.verification) {
      const check = checks.get(checkId);
      if (!check) {
        attempt.checks.push({
          id: checkId,
          argv: [],
          cwd: ".",
          status: CHECK_RUN_STATUS.MISSING_CHECK,
          exitCode: null,
          logPath: logStored,
        });
        continue;
      }
      const result = await runCheck(root, check, logStored);
      attempt.checks.push({
        id: result.id,
        argv: result.argv,
        cwd: result.cwd,
        status: result.status,
        exitCode: result.exitCode,
        logPath: result.logPath,
        error: result.error,
      });
      await appendLog(
        root,
        logStored,
        `\n[${checkId}] ${check.argv.join(" ")}\n${result.stdout}${result.stderr}\nstatus=${result.status}\n`,
      );
      await atomicWrite(root, attemptStored, attempt);
    }

    try {
      attempt.fingerprintAfter = (await fingerprint(root, state.config, state.tasks)).digest;
    } catch (error) {
      attempt.errors.push(error instanceof Error ? error.message : String(error));
    }

    const failed = attempt.checks.filter((item) => item.status !== CHECK_RUN_STATUS.PASSED);
    const mutated =
      attempt.fingerprintBefore &&
      attempt.fingerprintAfter &&
      attempt.fingerprintBefore !== attempt.fingerprintAfter;

    if (!attempt.errors.length && !failed.length && !mutated && attempt.fingerprintAfter) {
      attempt.status = ATTEMPT_STATUS.PASSED;
      attempt.endedAt = new Date().toISOString();
      task.state = TASK_STATE.VERIFIED;
      task.evidence = {
        status: "passed",
        attemptId,
        fingerprintBefore: attempt.fingerprintBefore ?? undefined,
        fingerprintAfter: attempt.fingerprintAfter,
        checks: attempt.checks.map((item) => ({ id: item.id, status: item.status })),
        verifiedAt: attempt.endedAt,
      };
    } else {
      attempt.status = ATTEMPT_STATUS.FAILED;
      attempt.endedAt = new Date().toISOString();
      if (mutated) attempt.errors.push("configured inputs changed while checks ran");
      task.evidence = {
        status: "failed",
        attemptId,
        failure: {
          classification: mutated ? "changed_during_verification" : "check_failed",
          failedChecks: failed.map((item) => item.id),
        },
        checks: attempt.checks.map((item) => ({ id: item.id, status: item.status })),
      };
    }

    await atomicWrite(root, attemptStored, attempt);
    await atomicWrite(root, HARNESS_PATHS.tasks, state.tasks);
    return {
      payload: {
        ok: attempt.status === ATTEMPT_STATUS.PASSED,
        id,
        attemptId,
        status: attempt.status,
        taskState: task.state,
        checks: attempt.checks.map((item) => ({ id: item.id, status: item.status })),
        errors: attempt.errors,
      },
      exitCode: attempt.status === ATTEMPT_STATUS.PASSED ? 0 : 1,
    };
  } finally {
    await release();
  }
}
