import { VIEW_MODE } from "./constants/view.ts";

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
      <button type="button" data-act="reset">Reset highlight</button>
      <button type="button" data-act="help">Help</button>
    </div>
    <ul class="search-hits" aria-label="Search results"></ul>
    <p class="help" role="note">Drag to pan. Wheel to zoom toward the cursor. Click a node to highlight neighbors. / focuses search. Escape clears highlight. This is a static graph, not a live system.</p>
    <div class="stage"><div class="board">${svg}</div></div>
  </main>
  <script>
  const payload = ${safePayload};
  const stage = document.querySelector(".stage");
  const board = document.querySelector(".board");
  const search = document.querySelector("input[aria-label='Search']");
  const hits = document.querySelector(".search-hits");
  const svg = board.querySelector("svg");
  const PAD = 24;
  const MIN = 0.1, MAX = 8;
  let scale = 1, x = 0, y = 0, dragging = false, last = {x:0,y:0};
  function diagramSize() {
    return { w: Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width || 1, h: Number(svg.getAttribute("height")) || svg.viewBox.baseVal.height || 1 };
  }
  function apply() { board.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")"; }
  function clamp(value) { return Math.max(MIN, Math.min(MAX, value)); }
  function fit() {
    const size = diagramSize();
    const availW = Math.max(1, stage.clientWidth - 2 * PAD);
    const availH = Math.max(1, stage.clientHeight - 2 * PAD);
    scale = clamp(Math.min(availW / size.w, availH / size.h));
    x = (stage.clientWidth - size.w * scale) / 2;
    y = (stage.clientHeight - size.h * scale) / 2;
    apply();
  }
  function visible() {
    const size = diagramSize();
    return x + size.w * scale > 0 && y + size.h * scale > 0 && x < stage.clientWidth && y < stage.clientHeight;
  }
  function clearDim() {
    for (const item of document.querySelectorAll(".is-dim, .is-match")) item.classList.remove("is-dim", "is-match");
  }
  document.querySelector("[data-act=fit]").onclick = fit;
  document.querySelector("[data-act=zoom-in]").onclick = () => { scale = clamp(scale * 1.15); apply(); };
  document.querySelector("[data-act=zoom-out]").onclick = () => { scale = clamp(scale / 1.15); apply(); };
  document.querySelector("[data-act=theme]").onclick = () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  };
  document.querySelector("[data-act=full]").onclick = () => {
    const next = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    Promise.resolve(next).catch(() => {});
  };
  document.querySelector("[data-act=json]").onclick = () => {
    const blob = new Blob([JSON.stringify(payload.document, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "diagram.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  document.querySelector("[data-act=reset]").onclick = clearDim;
  document.querySelector("[data-act=help]").onclick = () => document.querySelector(".help").classList.toggle("is-open");
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest("g[data-kind=node]")) return;
    dragging = true;
    last = { x: e.clientX, y: e.clientY };
    stage.classList.add("is-panning");
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointerup", () => { dragging = false; stage.classList.remove("is-panning"); });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    x += e.clientX - last.x; y += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; apply();
  });
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const next = clamp(scale * (e.deltaY > 0 ? 0.92 : 1.08));
    x = cx - (cx - x) * (next / scale);
    y = cy - (cy - y) * (next / scale);
    scale = next;
    apply();
  }, { passive: false });
  search.addEventListener("input", () => {
    const q = search.value.toLowerCase();
    hits.innerHTML = "";
    hits.classList.toggle("is-open", Boolean(q));
    for (const node of document.querySelectorAll("g[data-kind=node]")) {
      const id = node.getAttribute("data-id") || "";
      const meta = payload.nodes.find((n) => n.id === id);
      const hit = !q || Boolean(meta && (meta.label + " " + meta.kind).toLowerCase().includes(q));
      node.classList.toggle("is-match", Boolean(q && hit));
      node.classList.toggle("is-dim", Boolean(q && !hit));
      if (q && hit && meta) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = meta.label + " (" + meta.kind + ")";
        button.onclick = () => { node.focus(); node.scrollIntoView({ block: "nearest" }); };
        item.appendChild(button);
        hits.appendChild(item);
      }
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
        const keep = related.has(itemId) || (edge && related.has(edge.source) && related.has(edge.target));
        item.classList.toggle("is-dim", !keep);
      }
    });
  });
  stage.addEventListener("click", (e) => { if (e.target === stage || e.target === board || e.target === svg) clearDim(); });
  window.addEventListener("keydown", (e) => {
    if (e.target === search) {
      if (e.key === "Escape") { search.blur(); hits.classList.remove("is-open"); }
      return;
    }
    if (e.key === "/") { e.preventDefault(); search.focus(); }
    if (e.key === "f") fit();
    if (e.key === "Escape") clearDim();
    if (e.key === "?") document.querySelector(".help").classList.toggle("is-open");
  });
  window.addEventListener("resize", () => { if (!visible()) fit(); });
  fit();
  </script>
</body>
</html>
`;
}
