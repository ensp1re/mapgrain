export const COMMAND_ID = {
  TOGGLE_THEME: "toggle-theme",
  TOGGLE_OUTLINE: "toggle-outline",
  TOGGLE_INSPECTOR: "toggle-inspector",
  UNDO: "undo",
  REDO: "redo",
  PRESENT: "present",
  WALK: "walk",
  RUN: "run",
  EXPORT_SVG: "export-svg",
  EXPORT_JSON: "export-json",
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
  HELP: "help",
  CONVERT_KIND: "convert-kind",
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
  { id: COMMAND_ID.WALK, label: "Walk through", shortcut: "W", scope: ACTION_SCOPE.CANVAS },
  { id: COMMAND_ID.RUN, label: "Run transitions", shortcut: "R", scope: ACTION_SCOPE.CANVAS },
  { id: COMMAND_ID.EXPORT, label: "Export", shortcut: "E", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.EXPORT_SVG, label: "Export SVG", shortcut: "", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.EXPORT_JSON, label: "Export JSON", shortcut: "J", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.TOGGLE_OUTLINE, label: "Outline", shortcut: "O", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.TOGGLE_INSPECTOR, label: "Details", shortcut: "I", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.TOGGLE_THEME, label: "Toggle theme", shortcut: "T", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.FIT_ALL, label: "Fit all", shortcut: "F", scope: ACTION_SCOPE.CANVAS },
  { id: COMMAND_ID.FOCUS, label: "Focus", shortcut: "⇧F", scope: ACTION_SCOPE.CANVAS },
  { id: COMMAND_ID.HELP, label: "Keyboard shortcuts", shortcut: "?", scope: ACTION_SCOPE.GLOBAL },
  { id: COMMAND_ID.CONVERT_KIND, label: "Switch diagram kind", shortcut: "", scope: ACTION_SCOPE.GLOBAL },
];

export const COMMAND_SCOPE_LABEL: Record<ActionScope, string> = {
  [ACTION_SCOPE.GLOBAL]: "Editor",
  [ACTION_SCOPE.CANVAS]: "Canvas",
  [ACTION_SCOPE.NODE]: "Selection",
  [ACTION_SCOPE.EDGE]: "Connection",
};

const SCOPE_ORDER: ActionScope[] = [
  ACTION_SCOPE.GLOBAL,
  ACTION_SCOPE.CANVAS,
  ACTION_SCOPE.NODE,
  ACTION_SCOPE.EDGE,
];

export function shortcutCommands(commands: CommandSpec[] = COMMANDS): CommandSpec[] {
  return commands.filter((item) => item.shortcut.length > 0);
}

export function commandsByScope(
  commands: CommandSpec[] = shortcutCommands(),
): Array<{ scope: ActionScope; label: string; items: CommandSpec[] }> {
  return SCOPE_ORDER.flatMap((scope) => {
    const items = commands.filter((item) => item.scope === scope);
    if (items.length === 0) return [];
    return [{ scope, label: COMMAND_SCOPE_LABEL[scope], items }];
  });
}
