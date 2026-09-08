export const VALIDATION_ERROR_CODE = {
  UNSUPPORTED_SCHEMA_VERSION: "unsupported_schema_version",
  INVALID_DOCUMENT: "invalid_document",
  DUPLICATE_ID: "duplicate_id",
  DANGLING_REFERENCE: "dangling_reference",
  GROUP_CYCLE: "group_cycle",
  MODE_CONSTRAINT: "mode_constraint",
} as const;
