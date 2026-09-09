export const COMMAND_ID = {
  TOGGLE_THEME: "toggle-theme",
  TOGGLE_OUTLINE: "toggle-outline",
  TOGGLE_INSPECTOR: "toggle-inspector",
  TOGGLE_CHAT: "toggle-chat",
  UNDO: "undo",
  REDO: "redo",
  PRESENT: "present",
  EXPORT_SVG: "export-svg",
  EXPORT_JSON: "export-json",
  FIT: "fit",
  FIT_ALL: "fit-all",
  FOCUS: "focus",
  DELETE: "delete",
  DUPLICATE: "duplicate",
  ALIGN_LEFT: "align-left",
  ALIGN_RIGHT: "align-right",
  ALIGN_TOP: "align-top",
  ALIGN_BOTTOM: "align-bottom",
  ARRANGE: "arrange",
  NEW: "new",
  IMPORT: "import",
  CONNECT: "connect",
  EXPORT: "export",
} as const;

export type CommandId = (typeof COMMAND_ID)[keyof typeof COMMAND_ID];

export const ACTION_SCOPE = {
  GLOBAL: "global",
  NODE: "node",
  EDGE: "edge",
  CANVAS: "canvas",
} as const;

export type ActionScope = (typeof ACTION_SCOPE)[keyof typeof ACTION_SCOPE];

export interface CommandSpec {
  id: CommandId;
  label: string;
  shortcut: string;
  scope: ActionScope;
}

export const COMMANDS: CommandSpec[] = [
  { id: COMMAND_ID.UNDO, label: "Undo", shortcut: "⌘Z", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.REDO, label: "Redo", shortcut: "⇧⌘Z", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.DELETE, label: "Delete", shortcut: "⌫", scope: ACTION_SCOPE.NODE },
  { id: COMMAND_ID.DUPLICATE, label: "Duplicate", shortcut: "⌘D", scope: ACTION_SCOPE.NODE },
  { id: COMMAND_ID.ALIGN_LEFT, label: "Align left", shortcut: "", scope: ACTION_SCOPE.NODE },
  { id: COMMAND_ID.ALIGN_RIGHT, label: "Align right", shortcut: "", scope: ACTION_SCOPE.NODE },
  { id: COMMAND_ID.ALIGN_TOP, label: "Align top", shortcut: "", scope: ACTION_SCOPE.NODE },
  { id: COMMAND_ID.ALIGN_BOTTOM, label: "Align bottom", shortcut: "", scope: ACTION_SCOPE.NODE },
  { id: COMMAND_ID.ARRANGE, label: "Arrange diagram", shortcut: "A", scope: ACTION_SCOPE.CANVAS },
  { id: COMMAND_ID.NEW, label: "New diagram", shortcut: "N", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.IMPORT, label: "Import JSON", shortcut: "", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.CONNECT, label: "Connect selected", shortcut: "", scope: ACTION_SCOPE.NODE },
  { id: COMMAND_ID.PRESENT, label: "Present", shortcut: "P", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.EXPORT, label: "Export", shortcut: "E", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.EXPORT_SVG, label: "Export SVG", shortcut: "", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.EXPORT_JSON, label: "Export JSON", shortcut: "J", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.TOGGLE_OUTLINE, label: "Outline", shortcut: "O", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.TOGGLE_INSPECTOR, label: "Details", shortcut: "I", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.TOGGLE_THEME, label: "Toggle theme", shortcut: "T", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.FIT_ALL, label: "Fit all", shortcut: "F", scope: ACTION_SCOPE.CANVAS },
  { id: COMMAND_ID.FOCUS, label: "Focus", shortcut: "⇧F", scope: ACTION_SCOPE.CANVAS },
];
