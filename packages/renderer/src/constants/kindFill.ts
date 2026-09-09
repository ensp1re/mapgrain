import { NODE_KIND, THEME, type NodeKind, type Theme } from "@mapgrain/document";

export const DARK_KIND_FILL: Record<NodeKind, string> = {
  [NODE_KIND.ACTOR]: "#2a3140",
  [NODE_KIND.SYSTEM]: "#2c3238",
  [NODE_KIND.GATEWAY]: "#2a2f3d",
  [NODE_KIND.SERVICE]: "#273238",
  [NODE_KIND.JOB]: "#2d2e38",
  [NODE_KIND.DATASTORE]: "#243238",
  [NODE_KIND.QUEUE]: "#322e26",
  [NODE_KIND.EXTERNAL]: "#32282c",
  [NODE_KIND.DECISION]: "#2e2a38",
  [NODE_KIND.PROCESS]: "#273238",
  [NODE_KIND.ENTITY]: "#2c3238",
  [NODE_KIND.PARTICIPANT]: "#2a3140",
  [NODE_KIND.STATE]: "#27272a",
};

export const LIGHT_KIND_FILL: Record<NodeKind, string> = {
  [NODE_KIND.ACTOR]: "#e4e8f2",
  [NODE_KIND.SYSTEM]: "#e6e8ec",
  [NODE_KIND.GATEWAY]: "#e4e6f3",
  [NODE_KIND.SERVICE]: "#dce8ea",
  [NODE_KIND.JOB]: "#e6e4f0",
  [NODE_KIND.DATASTORE]: "#d7e8e6",
  [NODE_KIND.QUEUE]: "#f0e8d8",
  [NODE_KIND.EXTERNAL]: "#f0e2e4",
  [NODE_KIND.DECISION]: "#e8e4f2",
  [NODE_KIND.PROCESS]: "#dce8ea",
  [NODE_KIND.ENTITY]: "#e6e8ec",
  [NODE_KIND.PARTICIPANT]: "#e4e8f2",
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
