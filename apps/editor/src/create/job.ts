import { JOB_STAGE, JOB_STATUS, JOB_TICK_MS, REPAIR_ACTION } from "../constants/create.ts";
import type { CreateJobResult, JobStage } from "../types/create.ts";

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException("aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runCreateJob(
  prompt: string,
  options: { providerConfigured: boolean; signal: AbortSignal; tickMs?: number },
): Promise<CreateJobResult> {
  const tick = options.tickMs ?? JOB_TICK_MS;
  const text = prompt;
  try {
    const stage: JobStage = JOB_STAGE.INTERPRETING;
    await wait(tick, options.signal);
    if (!options.providerConfigured) {
      return {
        status: JOB_STATUS.FAILED,
        prompt: text,
        stage,
        message: "Generation is not configured. Use an example or import a document.",
        repair: REPAIR_ACTION.OPEN_EXAMPLE,
      };
    }
    await wait(tick, options.signal);
    await wait(tick, options.signal);
    return {
      status: JOB_STATUS.FAILED,
      prompt: text,
      stage: JOB_STAGE.CHECKING,
      message: "Generation is not configured. Use an example or import a document.",
      repair: REPAIR_ACTION.OPEN_EXAMPLE,
    };
  } catch {
    return { status: JOB_STATUS.CANCELLED, prompt: text, stage: JOB_STAGE.INTERPRETING };
  }
}
