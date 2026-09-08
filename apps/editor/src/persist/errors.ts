import { PERSIST_ERROR_CODE } from "../constants/persist.ts";
import type { PersistErrorCode } from "../types/persist.ts";

export { PERSIST_ERROR_CODE };

export class PersistError extends Error {
  readonly code: PersistErrorCode;

  constructor(code: PersistErrorCode, message: string) {
    super(message);
    this.name = "PersistError";
    this.code = code;
  }
}

export function persistErrorMessage(code: PersistErrorCode): string {
  switch (code) {
    case PERSIST_ERROR_CODE.CONFLICT:
      return "The file changed on disk. Download this draft or reload the file.";
    case PERSIST_ERROR_CODE.NOT_FOUND:
      return "The file was moved or deleted. Download this draft.";
    case PERSIST_ERROR_CODE.PERMISSION:
      return "Permission denied. Download this draft.";
    case PERSIST_ERROR_CODE.DISK_FULL:
      return "Disk is full. Download this draft.";
    case PERSIST_ERROR_CODE.RENAME_FAILED:
      return "Could not replace the file. Download this draft.";
    case PERSIST_ERROR_CODE.IF_MATCH:
      return "Save needs a current file revision. Reload or download this draft.";
    default:
      return "Save failed. Download this draft.";
  }
}

export function persistErrorFromHttp(status: number, body: unknown): PersistError {
  const record = body && typeof body === "object" ? (body as { code?: string; error?: string }) : {};
  const code = Object.values(PERSIST_ERROR_CODE).find((value) => value === record.code);
  if (code) return new PersistError(code, persistErrorMessage(code));
  if (status === 409) return new PersistError(PERSIST_ERROR_CODE.CONFLICT, persistErrorMessage(PERSIST_ERROR_CODE.CONFLICT));
  if (status === 404) return new PersistError(PERSIST_ERROR_CODE.NOT_FOUND, persistErrorMessage(PERSIST_ERROR_CODE.NOT_FOUND));
  if (status === 403) return new PersistError(PERSIST_ERROR_CODE.PERMISSION, persistErrorMessage(PERSIST_ERROR_CODE.PERMISSION));
  if (status === 428) return new PersistError(PERSIST_ERROR_CODE.IF_MATCH, persistErrorMessage(PERSIST_ERROR_CODE.IF_MATCH));
  if (status === 507) return new PersistError(PERSIST_ERROR_CODE.DISK_FULL, persistErrorMessage(PERSIST_ERROR_CODE.DISK_FULL));
  return new PersistError(PERSIST_ERROR_CODE.IO, record.error ?? persistErrorMessage(PERSIST_ERROR_CODE.IO));
}
