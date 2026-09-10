# Editor UI rules

These rules apply to the editor chrome. They are not product claims.

## Header

- Export is the emphasized action. Present is in the bar when space allows.
- More holds Outline, Details, Commands, Help, and any action the current layout hid.
- New diagram and Open file live in the document menu, with a visible Back to diagram on the New page when an editor session exists.
- The title field has `min-width: 0`, flexes, and truncates. The full title is editable on focus.
- Save status uses a fixed-width slot so Saved / Saving… does not shift actions. Failures open a recovery menu.
- Layouts are a few width buckets of the header itself, with hysteresis. Do not scale the header or scroll it horizontally.

## Menus and selectors

- One portaled overlay. Menus, listboxes, and modal dialogs are different patterns. Do not focus-trap menus.
- Menu rows: optional icon, left label, right shortcut. No card-per-row. Hide inert Chat.
- Selectors keep the trigger as a field. Options are a listbox. Arrow/typeahead highlight; Enter/click commit; Escape cancel. Show human kind names.
- Clamp overlays 8px inside the visual viewport. Dismiss outside pointer without activating what is underneath.

## New page

- Dedicated start layout with one vertical scroll container. Do not clip page content.
- Mode cards create diagrams. Do not offer a second unexplained blank button.
- Open file is a real button. Recents are rows. Agent install is a disclosure with copyable commands for each documented agent.

## Panels and canvas

- Outline rows: chevron, icon, label. Truncate labels; full text stays on focus and in the inspector.
- Inspector uses one inset, a single keep-position checkbox, and short connection lines (`From X · calls`).
- Fit shows the diagram. Focus shows the selection. Keep both actions. Do not fit after every keystroke.

## Motion

- 100–150ms opacity/color. Respect reduced motion. Do not animate nodes while typing.
