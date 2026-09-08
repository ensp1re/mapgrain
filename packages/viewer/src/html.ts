import { VIEW_MODE } from "./constants/view.ts";
import { viewerClientScript } from "./runtime.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function wrapViewer(
  title: string,
  svg: string,
  payload: string,
  background: string,
  theme: "dark" | "light" = "dark",
): string {
  const safePayload = payload.replaceAll("<", "\\u003c");
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; --bg: ${background}; --fg: #f4f1ea; --muted: #9a958c; --accent: #5b6cff;
      --mg-bg: #1c1c1f; --mg-surface: #27272a; --mg-border: #3f3f46; --mg-text: #f4f4f5; --mg-muted: #a1a1aa; --mg-edge: #71717a; --mg-group: #3f3f46; --mg-port: #52525b; }
    html[data-theme="light"] { color-scheme: light; --bg: #f4f1ea; --fg: #1c1c1f; --muted: #5c5852;
      --mg-bg: #f4f1ea; --mg-surface: #fffcf7; --mg-border: #d6d3cd; --mg-text: #27272a; --mg-muted: #71717a; --mg-edge: #a1a1aa; --mg-group: #d6d3cd; --mg-port: #a1a1aa; }
    html, body { margin: 0; background: var(--bg); color: var(--fg); font-family: ui-sans-serif, system-ui, sans-serif; height: 100%; }
    .mapgrain-viewer { display: flex; flex-direction: column; height: 100%; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #3333; }
    .toolbar input, .toolbar select { font: inherit; background: var(--mg-surface); color: var(--fg); border: 1px solid var(--mg-border); border-radius: 6px; padding: 4px 8px; }
    .toolbar input { flex: 1; min-width: 120px; }
    .search-hits { list-style: none; margin: 0; padding: 0 12px; display: none; }
    .search-hits.is-open { display: block; }
    .search-hits button { display: block; width: 100%; text-align: left; }
    .stage { overflow: hidden; flex: 1; min-height: 0; cursor: grab; }
    .stage.is-panning { cursor: grabbing; }
    .board { transform-origin: 0 0; }
    svg { display: block; }
    .is-match rect { stroke: var(--accent); stroke-width: 2; }
    .is-dim { opacity: 0.28; }
    .help { display: none; padding: 12px; }
    .help.is-open { display: block; }
    .status { margin: 0; padding: 0 12px; color: var(--muted); min-height: 1.4em; }
    button { font: inherit; }
  </style>
</head>
<body>
  <main class="mapgrain-viewer" data-mode="${VIEW_MODE.READONLY}" aria-label="Read-only diagram">
    <div class="toolbar">
      <span>Read-only view</span>
      <input aria-label="Search" placeholder="Search nodes"/>
      <button type="button" data-act="fit">Fit</button>
      <button type="button" data-act="zoom-in">+</button>
      <button type="button" data-act="zoom-out">−</button>
      <span data-zoom aria-live="polite">100%</span>
      <button type="button" data-act="theme">Theme</button>
      <button type="button" data-act="full">Fullscreen</button>
      <button type="button" data-act="reach-up">Upstream</button>
      <button type="button" data-act="reach-down">Downstream</button>
      <label>From <select data-act="route-from" aria-label="Route from"></select></label>
      <label>To <select data-act="route-to" aria-label="Route to"></select></label>
      <button type="button" data-act="route">Route</button>
      <label>View <select data-act="view" aria-label="Named view"></select></label>
      <button type="button" data-act="json">Download JSON</button>
      <button type="button" data-act="reset">Reset highlight</button>
      <button type="button" data-act="help">Help</button>
    </div>
    <p class="status" data-status role="status"></p>
    <ul class="search-hits" aria-label="Search results"></ul>
    <p class="help" role="note">Drag to pan. Wheel or +/- to zoom. Click or Enter a node to focus. Upstream/Downstream follow directed edges and stop at cycles. Route shows one path or No route. / focuses search. Escape clears highlight. Named views and focus restore from the local hash. This is a static graph, not a live system.</p>
    <div class="stage"><div class="board">${svg}</div></div>
  </main>
  <script>
  const payload = ${safePayload};
  ${viewerClientScript()}
  </script>
</body>
</html>
`;
}
