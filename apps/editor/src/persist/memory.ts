import type { EditorSnapshot } from "../types/editor.ts";
import type { PersistStore } from "../types/persist.ts";
import { snapshotFromStored, storedFromSnapshot } from "./codec.ts";

export function memoryStore(initial: unknown = null): PersistStore {
  const files = new Map<string, unknown>();
  const first = snapshotFromStored(initial);
  if (first) files.set(first.document.id, storedFromSnapshot(first));
  return {
    durable: false,
    async load(id) {
      if (id) return snapshotFromStored(files.get(id) ?? null);
      const last = [...files.values()].at(-1);
      return snapshotFromStored(last ?? null);
    },
    async save(snapshot: EditorSnapshot) {
      files.set(snapshot.document.id, storedFromSnapshot(snapshot));
    },
    async list() {
      return [...files.values()].flatMap((value) => {
        const snap = snapshotFromStored(value);
        return snap ? [{ id: snap.document.id, title: snap.document.title }] : [];
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
