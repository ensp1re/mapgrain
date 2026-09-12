import {
  DB_NAME,
  DB_VERSION,
  LAST_ACTIVE_KEY,
  LEGACY_STORE,
  META_STORE,
  STORE_NAME,
} from "../constants/persist.ts";
import type { EditorSnapshot } from "../types/editor.ts";
import type { PersistStore, RecentDocument, StoredWorkspace } from "../types/persist.ts";
import { chooseLastActive } from "./active.ts";
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
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
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
      if (event.oldVersion < 4 && event.oldVersion > 0 && tx && db.objectStoreNames.contains(STORE_NAME)) {
        const keysReq = tx.objectStore(STORE_NAME).getAllKeys();
        keysReq.onsuccess = () => {
          const keys = keysReq.result;
          const last = Array.isArray(keys) ? keys.at(-1) : keys;
          if (typeof last === "string") tx.objectStore(META_STORE).put(last, LAST_ACTIVE_KEY);
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function recentFromStored(value: unknown): RecentDocument | null {
  const snap = snapshotFromStored(value);
  if (!snap) return null;
  const rec = value as StoredWorkspace;
  return {
    id: snap.document.id,
    title: snap.document.title,
    lastOpenedAt: rec.lastOpenedAt,
    updatedAt: rec.updatedAt,
  };
}

export function indexedDbStore(): PersistStore {
  return {
    durable: true,
    async load(id) {
      const db = await openDb();
      try {
        const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
        const documents = tx.objectStore(STORE_NAME);
        const meta = tx.objectStore(META_STORE);
        const all = await requestToPromise(documents.getAll());
        const records = (Array.isArray(all) ? all : []).flatMap((value) => {
          const recent = recentFromStored(value);
          return recent ? [recent] : [];
        });
        const storedId = id ?? (await requestToPromise(meta.get(LAST_ACTIVE_KEY)));
        const chosen = chooseLastActive(records, typeof storedId === "string" ? storedId : null);
        if (!chosen) return null;
        const raw = await requestToPromise(documents.get(chosen));
        const snap = snapshotFromStored(raw);
        if (!snap) return null;
        const existing = raw as StoredWorkspace;
        const now = new Date().toISOString();
        documents.put({ ...existing, lastOpenedAt: now }, chosen);
        meta.put(chosen, LAST_ACTIVE_KEY);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error("IndexedDB load failed"));
        });
        return snap;
      } finally {
        db.close();
      }
    },
    async save(snapshot: EditorSnapshot) {
      const db = await openDb();
      try {
        const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
        const documents = tx.objectStore(STORE_NAME);
        const existing = (await requestToPromise(documents.get(snapshot.document.id))) as StoredWorkspace | undefined;
        const stored = storedFromSnapshot(snapshot, {
          updatedAt: new Date().toISOString(),
          lastOpenedAt: existing?.lastOpenedAt,
        });
        documents.put(stored, snapshot.document.id);
        tx.objectStore(META_STORE).put(snapshot.document.id, LAST_ACTIVE_KEY);
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
        const records = (Array.isArray(all) ? all : []).flatMap((value) => {
          const recent = recentFromStored(value);
          return recent ? [recent] : [];
        });
        return records.sort((left, right) => {
          const leftAt = left.lastOpenedAt ?? left.updatedAt ?? "";
          const rightAt = right.lastOpenedAt ?? right.updatedAt ?? "";
          return rightAt.localeCompare(leftAt);
        });
      } finally {
        db.close();
      }
    },
    async remove(id: string) {
      const db = await openDb();
      try {
        const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        const meta = tx.objectStore(META_STORE);
        const active = await requestToPromise(meta.get(LAST_ACTIVE_KEY));
        // The removed document must not stay the one that reopens.
        if (active === id) meta.delete(LAST_ACTIVE_KEY);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
          tx.onabort = () => reject(tx.error ?? new Error("IndexedDB delete aborted"));
        });
      } finally {
        db.close();
      }
    },
  };
}
