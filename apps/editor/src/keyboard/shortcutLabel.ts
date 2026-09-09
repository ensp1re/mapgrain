export function usesAppleModifier(platform = globalThis.navigator?.platform ?? ""): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export function shortcutLabel(shortcut: string, apple = usesAppleModifier()): string {
  if (apple) return shortcut;
  return shortcut.replaceAll("⇧", "Shift+").replaceAll("⌘", "Ctrl+");
}
