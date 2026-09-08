import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin } from "vite";
import { OFFLINE_MANIFEST_NAME, SERVICE_WORKER_PATH } from "../constants/offline.ts";
import { collectOfflineManifest, renderServiceWorker } from "./assets.ts";

export function offlineManifestPlugin(): Plugin {
  let distDir = "dist";
  return {
    name: "mapgrain-offline-manifest",
    apply: "build",
    configResolved(config) {
      distDir = join(config.root, config.build.outDir);
    },
    closeBundle: {
      sequential: true,
      order: "post",
      async handler() {
        const manifest = await collectOfflineManifest(distDir);
        await writeFile(join(distDir, OFFLINE_MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
        await writeFile(join(distDir, SERVICE_WORKER_PATH), renderServiceWorker(manifest));
      },
    },
  };
}
