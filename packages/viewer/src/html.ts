import { VIEW_MODE } from "./constants/view.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function wrapViewer(title: string, svg: string, payload: string, background: string): string {
  const safePayload = payload.replaceAll("<", "\\u003c");
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; --bg: ${background}; --fg: #f4f1ea; --muted: #9a958c; --accent: #5b6cff; }
    html[data-theme="light"] { color-scheme: light; --bg: #f4f1ea; --fg: #1c1c1f; --muted: #5c5852; }
    html, body { margin: 0; background: var(--bg); color: var(--fg); font-family: ui-sans-serif, system-ui, sans-serif; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #3333; }
    .toolbar input { flex: 1; min-width: 120px; }
    .stage { overflow: hidden; height: calc(100vh - 52px); cursor: grab; }
    .stage.is-panning { cursor: grabbing; }
    .board { transform-origin: 0 0; }
    svg { display: block; }
    .is-match rect { stroke: var(--accent); stroke-width: 2; }
    .is-dim { opacity: 0.28; }
    .help { display: none; padding: 12px; }
    .help.is-open { display: block; }
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
      <button type="button" data-act="theme">Theme</button>
      <button type="button" data-act="full">Fullscreen</button>
      <button type="button" data-act="json">Download JSON</button>
      <button type="button" data-act="help">Help</button>
    </div>
    <p class="help" role="note">Drag to pan. Wheel to zoom. Click a node to highlight neighbors. / focuses search. This is a static graph, not a live system.</p>
    <div class="stage"><div class="board">${svg}</div></div>
  </main>
  <script>
  const payload = ${safePayload};
  const stage = document.querySelector(".stage");
  const board = document.querySelector(".board");
  const search = document.querySelector("input[aria-label='Search']");
  let scale = 1, x = 0, y = 0, dragging = false, last = {x:0,y:0};
  function apply() { board.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")"; }
  function fit() { scale = 1; x = 0; y = 0; apply(); }
  document.querySelector("[data-act=fit]").onclick = fit;
  document.querySelector("[data-act=zoom-in]").onclick = () => { scale *= 1.15; apply(); };
  document.querySelector("[data-act=zoom-out]").onclick = () => { scale /= 1.15; apply(); };
  document.querySelector("[data-act=theme]").onclick = () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  };
  document.querySelector("[data-act=full]").onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };
  document.querySelector("[data-act=json]").onclick = () => {
    const blob = new Blob([JSON.stringify(payload.document, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "diagram.json";
    a.click();
  };
  document.querySelector("[data-act=help]").onclick = () => document.querySelector(".help").classList.toggle("is-open");
  stage.addEventListener("pointerdown", (e) => { dragging = true; last = { x: e.clientX, y: e.clientY }; stage.classList.add("is-panning"); });
  window.addEventListener("pointerup", () => { dragging = false; stage.classList.remove("is-panning"); });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    x += e.clientX - last.x; y += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; apply();
  });
  stage.addEventListener("wheel", (e) => { e.preventDefault(); scale *= e.deltaY > 0 ? 0.92 : 1.08; apply(); }, { passive: false });
  search.addEventListener("input", () => {
    const q = search.value.toLowerCase();
    for (const node of document.querySelectorAll("g[data-kind=node]")) {
      const id = node.getAttribute("data-id") || "";
      const hit = !q || (payload.nodes.find((n) => n.id === id && (n.label + " " + n.kind).toLowerCase().includes(q)));
      node.classList.toggle("is-match", Boolean(q && hit));
      node.classList.toggle("is-dim", Boolean(q && !hit));
    }
  });
  document.querySelectorAll("g[data-kind=node]").forEach((node) => {
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = node.getAttribute("data-id");
      const related = new Set([id]);
      for (const edge of payload.edges) {
        if (edge.source === id) related.add(edge.target);
        if (edge.target === id) related.add(edge.source);
      }
      for (const item of document.querySelectorAll("g[data-kind=node], g[data-kind=edge]")) {
        const itemId = item.getAttribute("data-id");
        const edge = payload.edges.find((row) => row.id === itemId);
        const keep = related.has(itemId) || (edge && (related.has(edge.source) && related.has(edge.target)));
        item.classList.toggle("is-dim", !keep);
      }
    });
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "/") { e.preventDefault(); search.focus(); }
    if (e.key === "f") fit();
    if (e.key === "?") document.querySelector(".help").classList.toggle("is-open");
  });
  </script>
</body>
</html>
`;
}
