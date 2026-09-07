import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { VALIDATION_ERROR_CODE } from "@mapgrain/document";
import { LAYOUT_STATUS } from "./constants/codes.ts";
import type {
  LayoutRequest,
  LayoutResult,
  WorkerLayoutRequest,
  WorkerLayoutResponse,
} from "./types/layout.ts";

const workerPath = fileURLToPath(new URL("./worker/layout.worker.ts", import.meta.url));

interface Pending {
  generation: number;
  resolve: (result: LayoutResult) => void;
}

export class LayoutEngine {
  private generation = 0;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly worker: Worker;

  constructor() {
    this.worker = new Worker(workerPath, {
      execArgv: ["--experimental-strip-types"],
    });
    this.worker.on("message", (message: WorkerLayoutResponse) => {
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (waiter.generation !== this.generation) {
        waiter.resolve({ status: LAYOUT_STATUS.SUPERSEDED, generation: waiter.generation });
        return;
      }
      if (message.status === LAYOUT_STATUS.LAID_OUT) {
        waiter.resolve({
          status: LAYOUT_STATUS.LAID_OUT,
          generation: waiter.generation,
          threadId: message.threadId,
          positions: message.positions,
        });
        return;
      }
      if (message.status === LAYOUT_STATUS.CONFLICT) {
        waiter.resolve({
          status: LAYOUT_STATUS.CONFLICT,
          generation: waiter.generation,
          threadId: message.threadId,
          conflict: message.conflict,
        });
        return;
      }
      waiter.resolve({
        status: LAYOUT_STATUS.INVALID,
        generation: waiter.generation,
        errors: message.errors,
      });
    });
    this.worker.on("error", (error) => {
      for (const [id, waiter] of this.pending) {
        this.pending.delete(id);
        waiter.resolve({
          status: LAYOUT_STATUS.INVALID,
          generation: waiter.generation,
          errors: [
            {
              code: VALIDATION_ERROR_CODE.INVALID_DOCUMENT,
              message: error.message,
              path: "/",
              elementId: null,
            },
          ],
        });
      }
    });
  }

  layout(request: LayoutRequest): Promise<LayoutResult> {
    const generation = (this.generation += 1);
    const id = this.nextId;
    this.nextId += 1;
    const payload: WorkerLayoutRequest = {
      id,
      document: request.document,
      pins: request.pins ?? {},
    };
    return new Promise((resolve) => {
      this.pending.set(id, { generation, resolve });
      this.worker.postMessage(payload);
    });
  }

  async dispose(): Promise<void> {
    await this.worker.terminate();
    this.pending.clear();
  }
}

export function createLayoutEngine(): LayoutEngine {
  return new LayoutEngine();
}
