export function edgeCaption(type: string, label?: string): string {
  return [type, label].filter((part) => Boolean(part)).join(" · ");
}
