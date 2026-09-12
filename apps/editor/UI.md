# Editor UI rules

These rules apply to the editor chrome. They are not product claims.

## Tokens

- `styles/tokens.css` owns every colour, space, radius, type size, z-index, motion and control
  size. `styles/app.css` picks from them. A raw px or hex in a chrome rule is a bug to fix.
- Light and dark define the same token names. Never define a colour in only one theme.
- Pane width defaults live in both `tokens.css` and `constants/layout.ts`; keep them equal.
- Breakpoints are `BREAKPOINT - 1` from `constants/layout.ts`. Do not invent a fourth set.

## Fields and scrolling

- Text inputs and select triggers share one height, inset, radius and background.
- Focus is a ring: accent border plus a soft outer shadow. No hairline browser outline, and no
  field without a visible focus state. Forced-colors keeps a real outline.
- Every scroll container uses the app's own scrollbar. A dark pane never gets a light gutter.
- Panes resize from their inner edge, clamped to the floor and ceiling in `constants/layout.ts`,
  and remember their width per viewer. Double-click resets.

## Header

- Export is the emphasized action. Present is in the bar when space allows.
- More holds Outline, Details, Commands, Help, and any action the current layout hid.
- New diagram and Open file live in the document menu, with a visible Back to diagram on the New page when an editor session exists.
- The title field has `min-width: 0`, flexes, and truncates. The full title is editable on focus.
- Save status uses a fixed-width slot so Saved / Saving… does not shift actions. Failures open a recovery menu.
- Layouts are a few width buckets of the header itself, with hysteresis. Do not scale the header or scroll it horizontally.

## Menus and selectors

- One portaled overlay. Menus, listboxes, and modal dialogs are different patterns. Do not focus-trap menus.
- Menu rows: optional icon, left label, right shortcut. No card-per-row.
- Selectors keep the trigger as a field. Options are a listbox. Arrow/typeahead highlight; Enter/click commit; Escape cancel. Show human kind names.
- Clamp overlays 8px inside the visual viewport. A menu or listbox dismisses on an outside
  pointer and lets that click through; only a modal dialog swallows it.

## Templates

- A template is a real document, not a screenshot, and its card is drawn from that document
  through the export renderer so the two cannot drift.
- Using a template copies it with a fresh document id. Two templates opened in a row are two
  documents. An invalid template is reported, never silently dropped.
- Templates live in `src/templates/`, never in `tests/fixtures`. Nothing the editor ships
  imports a test fixture.

## Walkthrough

- Step order is derived from the diagram, so any document can be read without authoring.
  An authored story wins where one exists.
- Reading never writes. Everything outside the step recedes rather than disappearing.

## New page

- Dedicated start layout with one vertical scroll container. Do not clip page content.
- Mode cards create diagrams. Do not offer a second unexplained blank button.
- Open file is a real button. Recents are rows. Agent install is a disclosure with copyable commands for each documented agent.

## Canvas state

- React Flow's store and this app's state must agree on selection. Pass its node changes
  straight through; withholding them leaves the two stores rewriting each other.
- Every prop handed to React Flow keeps a stable identity across renders.
- A new node lands in view, joins the selection's group, is selected and opens for renaming.
- An empty canvas names the gestures that are not visible: rename, connect, arrange, commands.
- One place shows a rejected edit, it says what to do about it, and it can be dismissed.

## Panels and canvas

- Outline rows: chevron, icon, label. Truncate labels; full text stays on focus and in the inspector.
- Inspector uses one inset, a single keep-position checkbox, and short connection lines (`From X · calls`).
- Fit shows the diagram. Focus shows the selection. Keep both actions. Do not fit after every keystroke.

## Motion

- 100–150ms opacity/color. Respect reduced motion. Do not animate nodes while typing.
