import type { PERSIST_ERROR_CODE, SAVE_STATE } from "../constants/persist.ts";
import type { EditorSnapshot } from "./editor.ts";

export type SaveState = (typeof SAVE_STATE)[keyof typeof SAVE_STATE];
export type PersistErrorCode = (typeof PERSIST_ERROR_CODE)[keyof typeof PERSIST_ERROR_CODE];

export interface RecentDocument {
  id: string;
  title: string;
  lastOpenedAt?: string;
  updatedAt?: string;
}

export interface PersistStore {
  durable: boolean;
  load(id?: string): Promise<EditorSnapshot | null>;
  save(snapshot: EditorSnapshot): Promise<void>;
  list(): Promise<RecentDocument[]>;
  /** Forgets one document. Absent where the store holds a single file it does not own. */
  remove?(id: string): Promise<void>;
}

export interface StoredWorkspace {
  document: unknown;
  positions: EditorSnapshot["positions"];
  updatedAt?: string;
  lastOpenedAt?: string;
}
