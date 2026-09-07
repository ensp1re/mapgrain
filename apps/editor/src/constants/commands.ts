export const COMMAND_ID = {
  TOGGLE_THEME: "toggle-theme",
  TOGGLE_OUTLINE: "toggle-outline",
  TOGGLE_CHAT: "toggle-chat",
  UNDO: "undo",
  REDO: "redo",
  PRESENT: "present",
  EXPORT_SVG: "export-svg",
  EXPORT_JSON: "export-json",
  FIT: "fit",
} as const;

export type CommandId = (typeof COMMAND_ID)[keyof typeof COMMAND_ID];

export interface CommandSpec {
  id: CommandId;
  label: string;
  shortcut: string;
}

export const COMMANDS: CommandSpec[] = [
  { id: COMMAND_ID.UNDO, label: "Undo", shortcut: "⌘Z" },
  { id: COMMAND_ID.REDO, label: "Redo", shortcut: "⇧⌘Z" },
  { id: COMMAND_ID.PRESENT, label: "Present", shortcut: "P" },
  { id: COMMAND_ID.EXPORT_SVG, label: "Export SVG", shortcut: "E" },
  { id: COMMAND_ID.EXPORT_JSON, label: "Export JSON", shortcut: "J" },
  { id: COMMAND_ID.TOGGLE_OUTLINE, label: "Toggle outline", shortcut: "O" },
  { id: COMMAND_ID.TOGGLE_CHAT, label: "Toggle chat", shortcut: "C" },
  { id: COMMAND_ID.TOGGLE_THEME, label: "Toggle theme", shortcut: "T" },
  { id: COMMAND_ID.FIT, label: "Fit diagram", shortcut: "F" },
];
