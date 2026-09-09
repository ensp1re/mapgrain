import { viewerChromeCss } from "@mapgrain/renderer/chrome";
import { VIEW_MODE } from "./constants/view.ts";
import { localeFrom, messagesFor, type Locale } from "./messages.ts";
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
  locale: Locale = "en",
): string {
  const safePayload = payload.replaceAll("<", "\\u003c");
  const copy = messagesFor(localeFrom(locale));
  return `<!DOCTYPE html>
<html lang="${localeFrom(locale)}" data-theme="${theme}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <style>
    ${viewerChromeCss()}
    :root { --bg: ${background}; }
  </style>
</head>
<body>
  <main class="mapgrain-viewer" data-mode="${VIEW_MODE.READONLY}" aria-label="Read-only diagram">
    <div class="toolbar">
      <span class="view-title">${escapeHtml(copy.readonly)}</span>
      <input aria-label="${escapeHtml(copy.search)}" placeholder="${escapeHtml(copy.search)}"/>
      <div class="viewport-bar" role="group" aria-label="Viewport">
        <button type="button" data-act="zoom-out" aria-label="Zoom out">−</button>
        <span data-zoom aria-live="polite">100%</span>
        <button type="button" data-act="zoom-in" aria-label="Zoom in">+</button>
        <button type="button" data-act="fit">${escapeHtml(copy.fit)}</button>
        <button type="button" data-act="focus">${escapeHtml(copy.focus)}</button>
      </div>
      <button type="button" data-act="more" aria-expanded="false">${escapeHtml(copy.more)}</button>
      <div class="toolbar-advanced" data-advanced>
        <button type="button" data-act="theme">${escapeHtml(copy.theme)}</button>
        <button type="button" class="wide" data-act="full">${escapeHtml(copy.fullscreen)}</button>
        <button type="button" data-act="reach-up">${escapeHtml(copy.upstream)}</button>
        <button type="button" data-act="reach-down">${escapeHtml(copy.downstream)}</button>
        <label>${escapeHtml(copy.from)} <select data-act="route-from" aria-label="${escapeHtml(copy.from)}" data-empty="${escapeHtml(copy.chooseNode)}"></select></label>
        <label>${escapeHtml(copy.to)} <select data-act="route-to" aria-label="${escapeHtml(copy.to)}" data-empty="${escapeHtml(copy.chooseNode)}"></select></label>
        <button type="button" data-act="route">${escapeHtml(copy.route)}</button>
        <label>${escapeHtml(copy.view)} <select data-act="view" aria-label="${escapeHtml(copy.view)}" data-empty="${escapeHtml(copy.chooseView)}"></select></label>
        <label>${escapeHtml(copy.story)} <select data-act="story" aria-label="${escapeHtml(copy.story)}" data-empty="${escapeHtml(copy.chooseStory)}"></select></label>
        <button type="button" data-act="story-prev">${escapeHtml(copy.previous)}</button>
        <button type="button" data-act="story-next">${escapeHtml(copy.next)}</button>
        <label>${escapeHtml(copy.lens)} <select data-act="lens" aria-label="${escapeHtml(copy.lens)}" data-empty="${escapeHtml(copy.chooseLens)}"></select></label>
        <button type="button" data-act="lens-reset">${escapeHtml(copy.resetLens)}</button>
        <button type="button" data-act="json">${escapeHtml(copy.json)}</button>
        <button type="button" data-act="reset">${escapeHtml(copy.reset)}</button>
        <button type="button" data-act="help">${escapeHtml(copy.help)}</button>
      </div>
    </div>
    <p class="status" data-status role="status"></p>
    <ul class="search-hits" aria-label="${escapeHtml(copy.searchHits)}"></ul>
    <p class="help" role="note">${escapeHtml(copy.helpText)}</p>
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
