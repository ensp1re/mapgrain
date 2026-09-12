import { NODE_KIND, THEME, type NodeKind, type Theme } from "@mapgrain/document";

export const DARK_KIND_FILL: Record<NodeKind, string> = {
  [NODE_KIND.ACTOR]: "#27314a",
  [NODE_KIND.SYSTEM]: "#2c3138",
  [NODE_KIND.GATEWAY]: "#2e2a48",
  [NODE_KIND.SERVICE]: "#1f3740",
  [NODE_KIND.JOB]: "#343043",
  [NODE_KIND.DATASTORE]: "#1d3a35",
  [NODE_KIND.QUEUE]: "#3b3220",
  [NODE_KIND.EXTERNAL]: "#3d2830",
  [NODE_KIND.DECISION]: "#343043",
  [NODE_KIND.PROCESS]: "#1f3740",
  [NODE_KIND.ENTITY]: "#2c3138",
  [NODE_KIND.PARTICIPANT]: "#27314a",
  [NODE_KIND.STATE]: "#27272a",
};

export const LIGHT_KIND_FILL: Record<NodeKind, string> = {
  [NODE_KIND.ACTOR]: "#dde5f7",
  [NODE_KIND.SYSTEM]: "#e8eaee",
  [NODE_KIND.GATEWAY]: "#e6e2fa",
  [NODE_KIND.SERVICE]: "#d5eaef",
  [NODE_KIND.JOB]: "#eae4f6",
  [NODE_KIND.DATASTORE]: "#d2ece4",
  [NODE_KIND.QUEUE]: "#f7ecd5",
  [NODE_KIND.EXTERNAL]: "#f9dfe3",
  [NODE_KIND.DECISION]: "#eae4f6",
  [NODE_KIND.PROCESS]: "#d5eaef",
  [NODE_KIND.ENTITY]: "#e8eaee",
  [NODE_KIND.PARTICIPANT]: "#dde5f7",
  [NODE_KIND.STATE]: "#fffcf7",
};

export function kindFillCssVars(theme: Theme, prefix = "--mg-kind-"): string {
  const table = theme === THEME.LIGHT ? LIGHT_KIND_FILL : DARK_KIND_FILL;
  return (Object.entries(table) as Array<[NodeKind, string]>)
    .map(([kind, hex]) => `${prefix}${kind}: ${hex}`)
    .join("; ");
}

export function fillForNodeKind(theme: Theme, kind: string, themed = false): string {
  const table = theme === THEME.LIGHT ? LIGHT_KIND_FILL : DARK_KIND_FILL;
  const hex = kind in table ? table[kind as NodeKind] : theme === THEME.LIGHT ? "#fffcf7" : "#27272a";
  if (themed) return `var(--mg-kind-${kind}, ${hex})`;
  return hex;
}
