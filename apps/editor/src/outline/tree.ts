import type { FlowNodeDraft } from "../types/flow.ts";

export interface OutlineEntry {
  node: FlowNodeDraft;
  depth: number;
}

export function outlineTree(nodes: FlowNodeDraft[]): OutlineEntry[] {
  const byParent = new Map<string | undefined, FlowNodeDraft[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = byParent.get(key) ?? [];
    list.push(node);
    byParent.set(key, list);
  }
  const rows: OutlineEntry[] = [];
  function walk(parentId: string | undefined, depth: number) {
    for (const node of byParent.get(parentId) ?? []) {
      rows.push({ node, depth });
      walk(node.id, depth + 1);
    }
  }
  walk(undefined, 0);
  return rows;
}
