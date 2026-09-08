export function edgeCaption(type: string, label?: string, extra?: string): string {
  return [type, extra, label].filter((part) => Boolean(part)).join(" · ");
}
