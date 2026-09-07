import { isEditableTarget } from "./commandShortcut.ts";

export function isUndoEvent(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  key: string;
  target: EventTarget | null;
}): boolean {
  if (isEditableTarget(event.target)) return false;
  const chord = event.metaKey || event.ctrlKey;
  return chord && !event.shiftKey && event.key.toLowerCase() === "z";
}

export function isRedoEvent(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  key: string;
  target: EventTarget | null;
}): boolean {
  if (isEditableTarget(event.target)) return false;
  const chord = event.metaKey || event.ctrlKey;
  if (chord && event.shiftKey && event.key.toLowerCase() === "z") return true;
  return chord && !event.shiftKey && event.key.toLowerCase() === "y";
}

export function isDeleteEvent(event: {
  key: string;
  target: EventTarget | null;
}): boolean {
  if (isEditableTarget(event.target)) return false;
  return event.key === "Backspace" || event.key === "Delete";
}

export function isDuplicateEvent(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  key: string;
  target: EventTarget | null;
}): boolean {
  if (isEditableTarget(event.target)) return false;
  const chord = event.metaKey || event.ctrlKey;
  return chord && event.key.toLowerCase() === "d";
}
