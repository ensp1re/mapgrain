/// <reference types="vite/client" />

declare module "*.json" {
  const value: unknown;
  export default value;
}

declare module "elkjs/lib/elk-api.js" {
  export default class ELK {
    constructor(options?: { workerFactory?: () => Worker; workerUrl?: string });
    layout(graph: unknown): Promise<unknown>;
  }
}

declare module "elkjs/lib/elk-worker.js?worker" {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}
