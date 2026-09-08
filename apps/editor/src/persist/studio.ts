import { STUDIO_GLOBAL, STUDIO_HEADER, STUDIO_IF_MATCH } from "../constants/studio.ts";
import type { PersistStore } from "../types/persist.ts";
import type { MapgrainStudio } from "../types/studio.ts";
import { backupBytes, snapshotFromStored } from "./codec.ts";
import { PERSIST_ERROR_CODE, PersistError, persistErrorFromHttp } from "./errors.ts";

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
  let chain = Promise.resolve();
  return {
    durable: true,
    async load() {
      const response = await fetchImpl("/api/document", {
        headers: { [STUDIO_HEADER]: config.token },
      });
      if (!response.ok) {
        throw persistErrorFromHttp(response.status, await response.json().catch(() => ({})));
      }
      etag = response.headers.get("etag") ?? "";
      let raw: unknown;
      try {
        raw = await response.json();
      } catch {
        throw new PersistError(PERSIST_ERROR_CODE.IO, "Opened file is not valid JSON.");
      }
      const snapshot = snapshotFromStored(raw);
      if (!snapshot) {
        throw new PersistError(PERSIST_ERROR_CODE.IO, "Opened file is not a valid Mapgrain document.");
      }
      openedId = snapshot.document.id;
      return snapshot;
    },
    async save(snapshot) {
      if (openedId && snapshot.document.id !== openedId) {
        throw new PersistError(PERSIST_ERROR_CODE.IO, "studio save refused: document is not the opened file");
      }
      const run = chain.then(async () => {
        const response = await fetchImpl("/api/document", {
          method: "PUT",
          headers: {
            [STUDIO_HEADER]: config.token,
            "content-type": "application/json",
            [STUDIO_IF_MATCH]: etag,
          },
          body: new TextDecoder().decode(backupBytes(snapshot)),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw persistErrorFromHttp(response.status, body);
        }
        etag = response.headers.get("etag") ?? etag;
      });
      chain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    async list() {
      return [{ id: "studio", title: config.fileName }];
    },
  };
}
