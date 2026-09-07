import type { EditorSnapshot } from "../types/editor.ts";
import type { PersistStore } from "../types/persist.ts";
import { snapshotFromStored, storedFromSnapshot } from "./codec.ts";

export function memoryStore(initial: unknown = null): PersistStore {
  let value: unknown = initial;
  return {
    async load() {
      return snapshotFromStored(value);
    },
    async save(snapshot: EditorSnapshot) {
      value = storedFromSnapshot(snapshot);
    },
  };
}

export function failingStore(message = "IndexedDB unavailable"): PersistStore {
  return {
    async load() {
      return null;
    },
    async save() {
      throw new Error(message);
    },
  };
}
