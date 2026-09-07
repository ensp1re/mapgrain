export const SCHEMA_VERSION = 1 as const;
export const LAYOUT_SECTION_VERSION = 1 as const;

export const DOCUMENT_KIND = {
  ARCHITECTURE: "architecture",
  WORKFLOW: "workflow",
} as const;

export const NODE_KIND = {
  SERVICE: "service",
  DATASTORE: "datastore",
  QUEUE: "queue",
  GATEWAY: "gateway",
  ACTOR: "actor",
  SYSTEM: "system",
  JOB: "job",
  EXTERNAL: "external",
} as const;

export const EDGE_TYPE = {
  CALLS: "calls",
  READS: "reads",
  WRITES: "writes",
  PUBLISHES: "publishes",
  SUBSCRIBES: "subscribes",
  DEPENDS_ON: "depends-on",
} as const;

export const EDGE_DIRECTION = {
  FORWARD: "forward",
  BOTH: "both",
  NONE: "none",
} as const;

export const PORT_SIDE = {
  NORTH: "north",
  SOUTH: "south",
  EAST: "east",
  WEST: "west",
} as const;

export const VIEW_KIND = {
  OVERVIEW: "overview",
  PATH: "path",
} as const;

export const LAYOUT_DIRECTION = {
  RIGHT: "right",
  DOWN: "down",
} as const;

export const THEME = {
  DARK: "dark",
  LIGHT: "light",
} as const;

export const EVIDENCE_STATE = {
  OBSERVED: "observed",
  ASSERTED: "asserted",
  INFERRED: "inferred",
} as const;

export const EVIDENCE_TARGET_KIND = {
  NODE: "node",
  EDGE: "edge",
  GROUP: "group",
} as const;

export function valuesOf<const T extends Record<string, string>>(
  record: T,
): Array<T[keyof T]> {
  return Object.values(record) as Array<T[keyof T]>;
}
