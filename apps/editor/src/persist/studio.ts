import { STUDIO_GLOBAL, STUDIO_HEADER } from "../constants/studio.ts";
import type { PersistStore } from "../types/persist.ts";
import type { MapgrainStudio } from "../types/studio.ts";
import { backupBytes, snapshotFromStored } from "./codec.ts";

export function readStudioConfig(): MapgrainStudio | null {
  if (typeof window === "undefined") return null;
  return window[STUDIO_GLOBAL] ?? null;
}

export function studioStore(
  config: MapgrainStudio,
  fetchImpl: typeof fetch = fetch,
): PersistStore {
  return {
    durable: true,
    async load() {
      const response = await fetchImpl("/api/document", {
        headers: { [STUDIO_HEADER]: config.token },
      });
      if (!response.ok) return null;
      return snapshotFromStored(await response.json());
    },
    async save(snapshot) {
      const response = await fetchImpl("/api/document", {
        method: "PUT",
        headers: { [STUDIO_HEADER]: config.token, "content-type": "application/json" },
        body: new TextDecoder().decode(backupBytes(snapshot)),
      });
      if (!response.ok) throw new Error("studio save failed");
    },
    async list() {
      return [{ id: "studio", title: config.fileName }];
    },
  };
}
