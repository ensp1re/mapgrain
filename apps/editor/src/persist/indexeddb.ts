import { DB_NAME, DB_VERSION, STORE_NAME, WORKSPACE_KEY } from "../constants/persist.ts";
import type { EditorSnapshot } from "../types/editor.ts";
import type { PersistStore } from "../types/persist.ts";
import { snapshotFromStored, storedFromSnapshot } from "./codec.ts";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function openDb(): Promise<IDBDatabase> {
  const indexedDB = globalThis.indexedDB;
  if (!indexedDB) throw new Error("IndexedDB is not available");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

export function indexedDbStore(): PersistStore {
  return {
    async load() {
      const db = await openDb();
      try {
        const value = await requestToPromise(
          db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(WORKSPACE_KEY),
        );
        return snapshotFromStored(value);
      } finally {
        db.close();
      }
    },
    async save(snapshot: EditorSnapshot) {
      const db = await openDb();
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(storedFromSnapshot(snapshot), WORKSPACE_KEY);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
          tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
        });
      } finally {
        db.close();
      }
    },
  };
}
