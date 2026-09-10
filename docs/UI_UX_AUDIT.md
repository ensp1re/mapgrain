# Mapgrain editor UI/UX audit and improvement plan

Audited by running `pnpm dev` and exercising the editor at 1440×900, 1024×768, and 390×844 in both themes, across all five diagram kinds. Issues below are confirmed in the running app unless marked as code-only findings.

## Confirmed bugs

### B1. Edge labels pile up into one unreadable bar
On the lifecycle example, the three transition captions render as one long dark bar at the top of the canvas — "transition · token va | transition · reset | sition · expire" — overlapping and clipping into each other.
Root cause: `placeEdgeLabel` in `packages/scene/src/routes.ts` tries 7 fractions × 4 sides against obstacles, but when every candidate collides it falls back to `labelBoxAt(points, size, 0.5·length, "above")` — which ignores obstacles entirely, so congested edges stack at the same anchor. Also, captions always prefix the edge type (`transition · <guard>`), which doubles label length for no information (`edgeCaption` in `packages/scene/src/caption.ts`).

### B2. Arrange preview leaves nodes offscreen
Applying "Arrange" on the nested-groups example pushes "Canonical renderer" past the right edge of the viewport and the preview does not refit — you cannot see the arrangement you are being asked to approve. `startArrange` should `fitView` (or at least warn) before showing the Discard/Apply bar.

### B3. Advertised keyboard shortcuts are dead
The Help overlay, the command menu, and toolbar tooltips advertise `N`, `P`, `E`, `J`, `O`, `I`, `T`, `A`, `F`, `Shift+F`. The only global keydown handler (`src/App.tsx` ~line 946) binds Escape, Ctrl+K, `?`, Ctrl+Z, Ctrl+Shift+Z/Ctrl+Y, Ctrl+D, Delete. Every single-letter shortcut shown in UI does nothing. Pressing `T` to toggle theme — the only path to light theme — silently fails.

### B4. Theme is effectively undiscoverable
The only way to switch themes is the command palette's "Toggle theme" item, and its `T` shortcut is dead (B3). There is no toolbar affordance, and the editor does not honor `prefers-color-scheme` — it always boots dark (`useState(THEME.DARK)` in `App.tsx`).

### B5. Phone layout: panels cover their own controls
At 390px the inspector bottom-sheet (`max-height: 48%`) is absolutely positioned over `.phone-controls` (bottom:16px, right:16px). With the inspector open, the "Outline"/"Details" buttons are physically unclickable — a Playwright click timed out with `<dt>Connections</dt> … intercepts pointer events`. The bottom controls need to move above the sheet or the sheet needs to dock below them.

### B6. Present mode leaks editing chrome
Present still shows "X selected · Enter to edit" (`.selection-bar`) and the Kinds legend, and it does not refit — the diagram sits as a small band in a huge empty canvas. Present should hide selection/status/legend UI and re-fit on entry.

### B7. Native controls ignore the dark theme
No `color-scheme` is set, so unchecked checkboxes render as glaring white squares on the dark background (visible in the inspector "Keep position when arranging"), and scrollbars/meter UI stay light. One line — `color-scheme: dark` / `light` on `:root[data-theme]` — fixes this.

### B8. Outline search is clipped below 1280px
`--outline-w` drops to 160px at ≤1279px; the search field's `Ctrl+K` badge eats so much room the placeholder reads "Search compor…". Outline rows truncate to ~8 characters at the 390px overlay width. The pane needs a wider floor (or the badge should move out of the field).

### B9. Sequence fragments collide with message labels
`alt [reserve]` / `opt [timeout]` fragment frames are drawn straight through the message-caption pills ("reply · 3 · ok", "message · 4 · retry locally" crosses the opt frame boundary). Fragment rectangles are computed without regard to label boxes.

## Design / layout issues

### D1. Fit-to-view over-zooms sparse diagrams
Small diagrams open at 179–250% zoom, which makes node text look oversized and childish. `fitView` needs a `maxZoom` cap (~1.25) so small diagrams sit comfortably centered instead of filling the screen.

### D2. Approximate text measurement causes tight card fit
Node sizes come from `fontTextMeasurer` (`packages/scene/src/text.ts`), a per-codepoint unit-width table — not real font metrics. Long labels wrap late and titles land within a pixel or two of the card edge ("Workspace API" title nearly touches the card bottom). Either add a safety inset (~8px) to measured widths or measure with the real font via `OffscreenCanvas`/`canvas.measureText` when in the browser.

### D3. The 1280–768px "single" shell hides the Outline with no visible way back
`shellLayoutForWidth`: ≥1280 split, ≥768 single, else overlay. In `single`, the workspace renders `outline-w + 1fr` with no inspector — but the screenshot at 1024 shows the outline gone entirely, recoverable only via More → Outline (`O`), a dead shortcut. There is no rail/button in the canvas chrome to reopen it.

### D4. Stray floating labels
`.canvas-status` (the view name — "Whole workspace"/"All") floats top-right as bare muted text and reads like a broken fragment. `.selection-bar` bottom-right is similar. These should be styled chips or dropped.

### D5. Export dialog is a ragged chip pile
SVG/PNG/JPEG/WebP/Copy image/Story WebM/HTML/JSON wrap into uneven rows, and "Close" is styled identically to an export format. Group as: primary row (Copy, HTML, JSON) / image row (SVG, PNG, JPEG, WebP ×scale) / motion (Story WebM), with a header × close.

### D6. Empty canvas gives no guidance
A blank diagram is a dotted void with one "Add component" button. No hint that double-click edits, Enter renames, handles connect, or Ctrl+K opens commands. A small centered empty-state card ("Add a component — pick a kind") plus a hint line would fix first-run confusion.

### D7. Edge creation is undiscoverable
Connections require dragging between 8px handles or selecting two nodes then finding "Connect selected" in the palette. Nothing on canvas or in the inspector advertises either path. A "Connect" affordance on the selected node (or an inspector hint "Select two components to connect") is needed.

### D8. Inconsistent affordances
- Outline group rows use `--muted` — they read as disabled.
- The "Group" row in the Add menu has no icon while every sibling does.
- More-menu rows have no icons; kind rows do.
- `.node-title` has no `min-width:0`/ellipsis — long single-line names can overflow the card's padding box.
- Mode cards and example cards on the start page are visually identical although one creates and the other opens.

### D9. Edge captions carry redundant type prefixes
"transition · token validate", "message · 1 · submit", "calls"/"reads" — the type word is always the same per diagram kind and adds noise, doubling label width and worsening B1/B9. Show only the guard/order/label on the edge; keep the type in the inspector/tooltip.

## Prioritized plan

**Phase 1 — stop the bleeding (bugs, small diffs, high trust)**
1. B3: either bind the advertised keys in the global keydown handler or strip the fake `shortcut` values — binding is one `event.key` switch in `App.tsx`.
2. B2: `fitView` after computing arrange preview.
3. B5: lift `.phone-controls` above the inspector sheet (z-index + bottom offset, or dock the sheet above the controls).
4. B6: hide `.selection-bar`/`.kind-legend` while `presenting`; `fitView` on present entry.
5. B7: `color-scheme` per theme.
6. B8: floor the outline width at ~200px; move `Ctrl+K` badge into the pane header or drop it.
7. B1 (minimal): make the `placeEdgeLabel` fallback keep searching (wider fraction set, include "below/under" first) and never stack two labels; D9 reduces the collision pressure too.
8. D1: `fitView({ maxZoom: 1.25 })`.
9. D4: restyle `.canvas-status` as a small bordered chip or remove it.

**Phase 2 — polish pass (visual rhythm)**
1. D2: real font metrics in the browser engine + padding safety inset; add `min-width:0`/ellipsis to `.node-title`.
2. B9 + D9: fragment boxes sized around label boxes; drop redundant caption prefixes.
3. D5: restructure the export dialog.
4. D8: affordance fixes (group row icon, enabled-looking group rows, consistent More-menu icons).
5. Inspector spacing: `dt` gap is 24px (`--space-5`) — halve it; connection rows should not wrap mid-word.
6. Node cards: bump `--node-pad-y`/kind-title gap so titles never kiss the border; verify at min/max node sizes.

**Phase 3 — discoverability (the "where do I click" problem)**
1. B4 + D3: visible controls — a theme toggle in More/a header icon, and an Outline/Details toggle that exists in every shell layout (collapsed rail icons at `single`, working overlay buttons at `overlay`).
2. D6: canvas empty state with the three core gestures (add / rename / connect) and the Ctrl+K hint.
3. D7: connect affordance on selection + inspector hint.
4. Start page: differentiate "creates a diagram" cards from "opens an example" cards (e.g. primary-filled create cards, subtle example cards); give "Open file" a labeled section.
5. First-run: after "New <kind>", drop one starter node pre-selected so the canvas is never a blank void.

**Phase 4 — verification**
- Extend `tests/capture-media.ts` style screenshots into a regression matrix (1440/1024/390 × dark/light × each diagram kind) so these layouts can't silently re-break.
- The five existing `tests/browser/*.test.ts` suites should gain assertions for B2 (all nodes in viewport after Arrange) and B3 (each advertised shortcut fires).

## Suggested order of attack
Phase 1 items are each <20 lines and fix everything the user *perceives as broken*. Phases 2–3 are the actual polish. Nothing here requires touching the document/layout engines except B1/B9/D2, which are `packages/scene` changes.
