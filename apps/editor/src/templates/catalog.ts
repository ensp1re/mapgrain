import { TEMPLATE_CATEGORY_ORDER, type TemplateCategory } from "../constants/templates.ts";
import type { TemplateSpec } from "../types/templates.ts";
import { ARCHITECTURE_TEMPLATES } from "./items/architecture.ts";
import { DATA_TEMPLATES } from "./items/data.ts";
import { PROCESS_TEMPLATES } from "./items/process.ts";
import { SEQUENCE_TEMPLATES } from "./items/sequence.ts";
import { STATE_TEMPLATES } from "./items/state.ts";

export const TEMPLATES: TemplateSpec[] = [
  ...ARCHITECTURE_TEMPLATES,
  ...PROCESS_TEMPLATES,
  ...SEQUENCE_TEMPLATES,
  ...DATA_TEMPLATES,
  ...STATE_TEMPLATES,
];

export function templatesByCategory(
  templates: TemplateSpec[] = TEMPLATES,
): Array<{ category: TemplateCategory; items: TemplateSpec[] }> {
  return TEMPLATE_CATEGORY_ORDER.flatMap((category) => {
    const items = templates.filter((item) => item.category === category);
    return items.length > 0 ? [{ category, items }] : [];
  });
}

export function findTemplate(id: string, templates: TemplateSpec[] = TEMPLATES): TemplateSpec | null {
  return templates.find((item) => item.id === id) ?? null;
}

/** Matches title, blurb and tags so "auth", "retry" or "c4" all find something. */
export function matchesTemplate(item: TemplateSpec, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  const haystack = [item.title, item.blurb, ...item.tags].join(" ").toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}
