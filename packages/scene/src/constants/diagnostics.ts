export const GEOMETRY_DIAGNOSTIC = {
  OVERLAP: "overlap",
  CONTAINMENT: "containment",
  LABEL_CLEARANCE: "label_clearance",
  CLIPPING: "clipping",
} as const;

export const DIAGNOSTIC_SEVERITY = {
  WARNING: "warning",
  ERROR: "error",
} as const;

export const BLOCKING_GEOMETRY = [
  GEOMETRY_DIAGNOSTIC.OVERLAP,
  GEOMETRY_DIAGNOSTIC.CLIPPING,
] as const;
