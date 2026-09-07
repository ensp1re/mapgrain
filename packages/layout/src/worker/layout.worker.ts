import { createRequire } from "node:module";
import { parentPort, threadId } from "node:worker_threads";
import { VALIDATION_ERROR_CODE } from "@mapgrain/document";
import { runLayout, type ElkEngine } from "../elk/run.ts";
import type { WorkerLayoutRequest } from "../types/layout.ts";

const require = createRequire(import.meta.url);
const ELK = require("elkjs/lib/elk.bundled.js") as new () => ElkEngine;
const elk = new ELK();

const port = parentPort;
if (!port) throw new Error("layout worker must run as a worker thread");

port.on("message", (message: WorkerLayoutRequest) => {
  void runLayout(message.id, threadId, message.document, message.pins, elk)
    .then((response) => port.postMessage(response))
    .catch((error: unknown) => {
      port.postMessage({
        id: message.id,
        threadId,
        status: "invalid",
        errors: [
          {
            code: VALIDATION_ERROR_CODE.INVALID_DOCUMENT,
            message: error instanceof Error ? error.message : String(error),
            path: "/",
            elementId: null,
          },
        ],
      });
    });
});
