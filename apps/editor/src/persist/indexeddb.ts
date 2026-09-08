import { DB_NAME, DB_VERSION, LEGACY_STORE, STORE_NAME } from "../constants/persist.ts";
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
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      const tx = request.transaction;
      if (event.oldVersion < 3 && tx && db.objectStoreNames.contains(LEGACY_STORE)) {
        const legacy = tx.objectStore(LEGACY_STORE);
        const read = legacy.get("current");
        read.onsuccess = () => {
          const value = read.result;
          const snap = snapshotFromStored(value);
          if (!snap) return;
          tx.objectStore(STORE_NAME).put(storedFromSnapshot(snap), snap.document.id);
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

export function indexedDbStore(): PersistStore {
  return {
    durable: true,
    async load(id) {
      const db = await openDb();
      try {
        const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
        if (id) return snapshotFromStored(await requestToPromise(store.get(id)));
        const all = await requestToPromise(store.getAll());
        const last = Array.isArray(all) ? all.at(-1) : all;
        return snapshotFromStored(last ?? null);
      } finally {
        db.close();
      }
    },
    async save(snapshot: EditorSnapshot) {
      const db = await openDb();
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(storedFromSnapshot(snapshot), snapshot.document.id);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
          tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
        });
      } finally {
        db.close();
      }
    },
    async list() {
      const db = await openDb();
      try {
        const all = await requestToPromise(
          db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll(),
        );
        const records = Array.isArray(all) ? all : [];
        return records
          .flatMap((value) => {
            const snap = snapshotFromStored(value);
            if (!snap) return [];
            const rec = value as { lastOpenedAt?: string; updatedAt?: string };
            return [
              {
                id: snap.document.id,
                title: snap.document.title,
                at: rec.lastOpenedAt ?? rec.updatedAt ?? "",
              },
            ];
          })
          .sort((left, right) => right.at.localeCompare(left.at))
          .map(({ id, title }) => ({ id, title }));
      } finally {
        db.close();
      }
    },
  };
}
