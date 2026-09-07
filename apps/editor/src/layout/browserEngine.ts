import { LAYOUT_STATUS, runLayout, type ElkEngine, type LayoutResult } from "@mapgrain/layout/run";
import type { Point } from "@mapgrain/scene";
import ELK from "elkjs/lib/elk-api.js";
import ElkWorker from "elkjs/lib/elk-worker.js?worker";

export class BrowserLayoutEngine {
  private generation = 0;
  private readonly elk: ElkEngine = new ELK({
    workerFactory: () => new ElkWorker(),
  }) as unknown as ElkEngine;

  async layout(document: unknown, pins: Record<string, Point>): Promise<LayoutResult> {
    const generation = (this.generation += 1);
    const response = await runLayout(generation, 0, document, pins, this.elk);
    if (generation !== this.generation) {
      return { status: LAYOUT_STATUS.SUPERSEDED, generation };
    }
    if (response.status === LAYOUT_STATUS.LAID_OUT) {
      return {
        status: LAYOUT_STATUS.LAID_OUT,
        generation,
        threadId: response.threadId,
        positions: response.positions,
      };
    }
    if (response.status === LAYOUT_STATUS.CONFLICT) {
      return {
        status: LAYOUT_STATUS.CONFLICT,
        generation,
        threadId: response.threadId,
        conflict: response.conflict,
      };
    }
    return {
      status: LAYOUT_STATUS.INVALID,
      generation,
      errors: response.errors,
    };
  }

  dispose(): void {
    this.generation += 1;
  }
}
