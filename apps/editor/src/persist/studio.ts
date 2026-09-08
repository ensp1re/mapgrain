import { STUDIO_GLOBAL, STUDIO_HEADER, STUDIO_IF_MATCH } from "../constants/studio.ts";
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
  let etag = "";
  let openedId: string | null = null;
  return {
    durable: true,
    async load() {
      const response = await fetchImpl("/api/document", {
        headers: { [STUDIO_HEADER]: config.token },
      });
      if (!response.ok) return null;
      etag = response.headers.get("etag") ?? "";
      const snapshot = snapshotFromStored(await response.json());
      openedId = snapshot?.document.id ?? null;
      return snapshot;
    },
    async save(snapshot) {
      if (openedId && snapshot.document.id !== openedId) {
        throw new Error("studio save refused: document is not the opened file");
      }
      const response = await fetchImpl("/api/document", {
        method: "PUT",
        headers: {
          [STUDIO_HEADER]: config.token,
          "content-type": "application/json",
          [STUDIO_IF_MATCH]: etag,
        },
        body: new TextDecoder().decode(backupBytes(snapshot)),
      });
      if (response.status === 409) throw new Error("studio save conflict");
      if (!response.ok) throw new Error("studio save failed");
      etag = response.headers.get("etag") ?? etag;
    },
    async list() {
      return [{ id: "studio", title: config.fileName }];
    },
  };
}
