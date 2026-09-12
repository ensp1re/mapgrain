import { COMMANDS, type CommandId } from "../constants/commands.ts";

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object" || !("tagName" in target)) return false;
  const tag = String(target.tagName);
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return "isContentEditable" in target && Boolean(target.isContentEditable);
}

const OVERLAY_ROLES = '[role="menu"], [role="listbox"], [role="dialog"]';

// Menu items and dialog buttons are focusable but not editable, so a bare letter typed
// inside an open menu used to run a global command as well as the menu's own typeahead.
export function isInsideOverlay(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object" || !("closest" in target)) return false;
  const closest = (target as Element).closest;
  if (typeof closest !== "function") return false;
  return Boolean(closest.call(target as Element, OVERLAY_ROLES));
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

/** Derived from COMMANDS so a shortcut cannot be advertised without being bound. */
const KEY_COMMANDS: Record<string, CommandId> = Object.fromEntries(
  COMMANDS.filter((command) => /^[A-Z]$/.test(command.shortcut)).map((command) => [
    command.shortcut.toLowerCase(),
    command.id,
  ]),
);

/** Shift plus a letter, keyed by the letter the browser reports (already uppercase). */
const SHIFT_KEY_COMMANDS: Record<string, CommandId> = Object.fromEntries(
  COMMANDS.filter((command) => /^⇧[A-Z]$/.test(command.shortcut)).map((command) => [
    command.shortcut.slice(1),
    command.id,
  ]),
);

export function commandForKeyEvent(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  key: string;
  target: EventTarget | null;
}): CommandId | null {
  if (isEditableTarget(event.target)) return null;
  if (isInsideOverlay(event.target)) return null;
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.repeat) return null;
  const shifted = SHIFT_KEY_COMMANDS[event.key];
  if (shifted) return shifted;
  if (event.shiftKey) return null;
  return KEY_COMMANDS[event.key.toLowerCase()] ?? null;
}
