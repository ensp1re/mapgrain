import { LAYOUT_STATUS, runLayout, type ElkEngine, type LayoutResult } from "@mapgrain/layout/run";
import type { Point } from "@mapgrain/scene";

async function loadElk(): Promise<ElkEngine> {
  const [{ default: ELK }, { default: ElkWorker }] = await Promise.all([
    import("elkjs/lib/elk-api.js"),
    import("elkjs/lib/elk-worker.js?worker"),
  ]);
  return new ELK({
    workerFactory: () => new ElkWorker(),
  }) as unknown as ElkEngine;
}

export class BrowserLayoutEngine {
  private generation = 0;
  private elk: Promise<ElkEngine> | null = null;

  private engine(): Promise<ElkEngine> {
    this.elk ??= loadElk();
    return this.elk;
  }

  async layout(document: unknown, pins: Record<string, Point>): Promise<LayoutResult> {
    const generation = (this.generation += 1);
    const elk = await this.engine();
    if (generation !== this.generation) {
      return { status: LAYOUT_STATUS.SUPERSEDED, generation };
    }
    const response = await runLayout(generation, 0, document, pins, elk);
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
