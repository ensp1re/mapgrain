import type { EditorSnapshot } from "../types/editor.ts";
import type { PersistStore, StoredWorkspace } from "../types/persist.ts";
import { chooseLastActive } from "./active.ts";
import { snapshotFromStored, storedFromSnapshot } from "./codec.ts";

export function memoryStore(initial: unknown = null): PersistStore {
  const files = new Map<string, StoredWorkspace>();
  let lastActiveId: string | null = null;
  const first = snapshotFromStored(initial);
  if (first) {
    files.set(first.document.id, storedFromSnapshot(first));
    lastActiveId = first.document.id;
  }
  return {
    durable: false,
    async load(id) {
      const records = [...files.entries()].map(([recordId, value]) => ({
        id: recordId,
        title: "",
        lastOpenedAt: value.lastOpenedAt,
        updatedAt: value.updatedAt,
      }));
      const chosen = id ?? chooseLastActive(records, lastActiveId);
      if (!chosen) return null;
      const existing = files.get(chosen);
      if (!existing) return null;
      lastActiveId = chosen;
      const now = new Date().toISOString();
      files.set(chosen, { ...existing, lastOpenedAt: now });
      return snapshotFromStored(files.get(chosen) ?? null);
    },
    async save(snapshot: EditorSnapshot) {
      const existing = files.get(snapshot.document.id);
      files.set(
        snapshot.document.id,
        storedFromSnapshot(snapshot, {
          updatedAt: new Date().toISOString(),
          lastOpenedAt: existing?.lastOpenedAt,
        }),
      );
      lastActiveId = snapshot.document.id;
    },
    async list() {
      return [...files.entries()].flatMap(([id, value]) => {
        const snap = snapshotFromStored(value);
        return snap
          ? [
              {
                id,
                title: snap.document.title,
                lastOpenedAt: value.lastOpenedAt,
                updatedAt: value.updatedAt,
              },
            ]
          : [];
      });
    },
  };
}

export function failingStore(message = "IndexedDB unavailable"): PersistStore {
  return {
    durable: false,
    async load() {
      return null;
    },
    async save() {
      throw new Error(message);
    },
    async list() {
      return [];
    },
  };
}
