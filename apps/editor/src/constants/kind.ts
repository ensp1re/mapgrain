import { NODE_KIND } from "@mapgrain/document";

export const KIND_SHORT: Record<string, string> = {
  [NODE_KIND.SERVICE]: "SVC",
  [NODE_KIND.DATASTORE]: "DS",
  [NODE_KIND.QUEUE]: "Q",
  [NODE_KIND.GATEWAY]: "GW",
  [NODE_KIND.ACTOR]: "ACT",
  [NODE_KIND.SYSTEM]: "SYS",
  [NODE_KIND.JOB]: "JOB",
  [NODE_KIND.EXTERNAL]: "EXT",
  [NODE_KIND.DECISION]: "DEC",
  [NODE_KIND.PARTICIPANT]: "P",
  [NODE_KIND.PROCESS]: "PRC",
  [NODE_KIND.ENTITY]: "ENT",
  [NODE_KIND.STATE]: "ST",
};

export function kindShort(kind: string): string {
  return KIND_SHORT[kind] ?? kind.slice(0, 3).toUpperCase();
}
