import type { FlowNodeDraft } from "../types/flow.ts";

export function matchesQuery(node: FlowNodeDraft, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${node.data.label} ${node.data.kind ?? ""} ${node.id}`.toLowerCase();
  return haystack.includes(needle);
}
