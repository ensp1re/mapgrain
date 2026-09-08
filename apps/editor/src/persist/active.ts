import type { RecentDocument } from "../types/persist.ts";

export function chooseLastActive(records: RecentDocument[], storedId: string | null): string | null {
  if (storedId && records.some((record) => record.id === storedId)) return storedId;
  const dated = records.filter((record) => record.lastOpenedAt || record.updatedAt);
  if (dated.length === 0) return records.at(-1)?.id ?? null;
  const sorted = [...dated].sort((left, right) => {
    const leftAt = left.lastOpenedAt ?? left.updatedAt ?? "";
    const rightAt = right.lastOpenedAt ?? right.updatedAt ?? "";
    return rightAt.localeCompare(leftAt);
  });
  return sorted[0]?.id ?? null;
}
