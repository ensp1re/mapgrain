import { SAVE_STATE } from "../constants/persist.ts";
import type { EditorSnapshot } from "../types/editor.ts";
import type { PersistStore, SaveState } from "../types/persist.ts";
import { PERSIST_ERROR_CODE, PersistError, persistErrorMessage } from "./errors.ts";

export interface SaveSession {
  schedule(snapshot: EditorSnapshot): void;
  flush(): Promise<void>;
  dispose(): void;
}

export function createSaveSession(options: {
  store: PersistStore;
  delayMs: number;
  fileBacked: boolean;
  onState: (state: SaveState) => void;
  onError: (message: string) => void;
}): SaveSession {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: EditorSnapshot | null = null;
  let chain = Promise.resolve();
  let disposed = false;
  let lastError: PersistError | null = null;

  const saving = options.fileBacked ? SAVE_STATE.FILE_SAVING : SAVE_STATE.SAVING;
  const saved = options.fileBacked ? SAVE_STATE.FILE_SAVED : SAVE_STATE.SAVED;

  function enqueue(work: () => Promise<void>): Promise<void> {
    const run = chain.then(work, work);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function write(snapshot: EditorSnapshot): Promise<void> {
    if (!options.store.durable) {
      options.onState(SAVE_STATE.TEMPORARY);
      return;
    }
    options.onState(saving);
    try {
      await options.store.save(snapshot);
      lastError = null;
      if (!disposed) options.onState(saved);
    } catch (error) {
      const persist =
        error instanceof PersistError
          ? error
          : new PersistError(PERSIST_ERROR_CODE.IO, error instanceof Error ? error.message : String(error));
      lastError = persist;
      if (!disposed) {
        options.onState(SAVE_STATE.RECOVERY);
        options.onError(persistErrorMessage(persist.code));
      }
      throw persist;
    }
  }

  async function commit(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const snapshot = pending;
    pending = null;
    if (!snapshot) {
      await chain;
      if (lastError) throw lastError;
      return;
    }
    await enqueue(() => write(snapshot));
  }

  return {
    schedule(snapshot) {
      if (disposed) return;
      pending = snapshot;
      if (!options.store.durable) {
        options.onState(SAVE_STATE.TEMPORARY);
        return;
      }
      options.onState(saving);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void commit();
      }, options.delayMs);
    },
    flush: commit,
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      const snapshot = pending;
      pending = null;
      if (snapshot && options.store.durable) {
        void options.store.save(snapshot).catch(() => undefined);
      }
    },
  };
}
