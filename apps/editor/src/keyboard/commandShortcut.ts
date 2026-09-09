export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object" || !("tagName" in target)) return false;
  const tag = String(target.tagName);
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return "isContentEditable" in target && Boolean(target.isContentEditable);
}

export function shouldOpenCommandMenu(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  key: string;
  target: EventTarget | null;
}): boolean {
  const chord = event.metaKey || event.ctrlKey;
  if (!chord || event.key.toLowerCase() !== "k") return false;
  return !isEditableTarget(event.target);
}

export function shouldOpenHelp(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey?: boolean;
  key: string;
  target: EventTarget | null;
}): boolean {
  if (isEditableTarget(event.target)) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return event.key === "?" || event.key === "F1";
}
