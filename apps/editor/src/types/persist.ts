import type { SAVE_STATE } from "../constants/persist.ts";
import type { EditorSnapshot } from "./editor.ts";

export type SaveState = (typeof SAVE_STATE)[keyof typeof SAVE_STATE];

export interface PersistStore {
  load(): Promise<EditorSnapshot | null>;
  save(snapshot: EditorSnapshot): Promise<void>;
}

export interface StoredWorkspace {
  document: unknown;
  positions: EditorSnapshot["positions"];
}
