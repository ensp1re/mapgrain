export const CLI_COMMAND = {
  VALIDATE: "validate",
  RENDER: "render",
  EXPORT: "export",
  VIEW: "view",
} as const;

export const EXIT_CODE = {
  OK: 0,
  ERROR: 1,
  USAGE: 2,
} as const;

export const DIAGNOSTIC_CODE = {
  USAGE: "usage",
  INVALID_DOCUMENT: "invalid_document",
  IO: "io",
} as const;

export const USAGE =
  "Usage: mapgrain <validate|render|export|view> <file> [--format json|svg|png|html] [-o file]";
