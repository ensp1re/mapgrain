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
  DELETE: "delete",
  DUPLICATE: "duplicate",
  ALIGN_LEFT: "align-left",
  ALIGN_RIGHT: "align-right",
  ALIGN_TOP: "align-top",
  ALIGN_BOTTOM: "align-bottom",
  ARRANGE: "arrange",
  NEW: "new",
  IMPORT: "import",
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
  { id: COMMAND_ID.DELETE, label: "Delete", shortcut: "⌫" },
  { id: COMMAND_ID.DUPLICATE, label: "Duplicate", shortcut: "⌘D" },
  { id: COMMAND_ID.ALIGN_LEFT, label: "Align left", shortcut: "" },
  { id: COMMAND_ID.ALIGN_RIGHT, label: "Align right", shortcut: "" },
  { id: COMMAND_ID.ALIGN_TOP, label: "Align top", shortcut: "" },
  { id: COMMAND_ID.ALIGN_BOTTOM, label: "Align bottom", shortcut: "" },
  { id: COMMAND_ID.ARRANGE, label: "Arrange diagram", shortcut: "A" },
  { id: COMMAND_ID.NEW, label: "New diagram", shortcut: "N" },
  { id: COMMAND_ID.IMPORT, label: "Import JSON", shortcut: "" },
  { id: COMMAND_ID.PRESENT, label: "Present", shortcut: "P" },
  { id: COMMAND_ID.EXPORT_SVG, label: "Export SVG", shortcut: "E" },
  { id: COMMAND_ID.EXPORT_JSON, label: "Export JSON", shortcut: "J" },
  { id: COMMAND_ID.TOGGLE_OUTLINE, label: "Toggle outline", shortcut: "O" },
  { id: COMMAND_ID.TOGGLE_CHAT, label: "Toggle chat", shortcut: "C" },
  { id: COMMAND_ID.TOGGLE_THEME, label: "Toggle theme", shortcut: "T" },
  { id: COMMAND_ID.FIT, label: "Fit diagram", shortcut: "F" },
];
