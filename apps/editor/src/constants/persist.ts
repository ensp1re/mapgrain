export const SAVE_STATE = {
  SAVED: "Saved",
  SAVING: "Saving",
  RECOVERY: "Recovery",
} as const;

export const DB_NAME = "mapgrain";
export const DB_VERSION = 1;
export const STORE_NAME = "workspace";
export const WORKSPACE_KEY = "current";
export const AUTOSAVE_MS = 250;
