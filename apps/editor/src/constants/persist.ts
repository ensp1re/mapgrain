export const SAVE_STATE = {
  SAVED: "Saved",
  SAVING: "Saving",
  RECOVERY: "Recovery",
  TEMPORARY: "Temporary session",
  FILE_SAVED: "Saved to file",
  FILE_SAVING: "Saving to file",
} as const;

export const PERSIST_ERROR_CODE = {
  CONFLICT: "conflict",
  NOT_FOUND: "not_found",
  PERMISSION: "permission",
  DISK_FULL: "disk_full",
  RENAME_FAILED: "rename_failed",
  IF_MATCH: "if_match",
  IO: "io",
} as const;

export const DB_NAME = "mapgrain";
export const DB_VERSION = 4;
export const LEGACY_STORE = "workspace";
export const STORE_NAME = "documents";
export const META_STORE = "meta";
export const LAST_ACTIVE_KEY = "lastActiveId";
export const WORKSPACE_KEY = "current";
export const AUTOSAVE_MS = 250;
