export const SAVE_STATE = {
  SAVED: "Saved",
  SAVING: "Saving",
  RECOVERY: "Recovery",
  TEMPORARY: "Temporary session",
  FILE_SAVED: "Saved to file",
  FILE_SAVING: "Saving to file",
} as const;

export const DB_NAME = "mapgrain";
export const DB_VERSION = 2;
export const STORE_NAME = "documents";
export const WORKSPACE_KEY = "current";
export const AUTOSAVE_MS = 250;
