export function viewerClientScript(): string {
  return `const stage = document.querySelector(".stage");
const board = document.querySelector(".board");
const search = document.querySelector("input[aria-label='Search']");
const hits = document.querySelector(".search-hits");
const status = document.querySelector("[data-status]");
const zoomLabel = document.querySelector("[data-zoom]");
const fromSel = document.querySelector("[data-act=route-from]");
const toSel = document.querySelector("[data-act=route-to]");
const viewSel = document.querySelector("[data-act=view]");
const storySel = document.querySelector("[data-act=story]");
const lensSel = document.querySelector("[data-act=lens]");
const svg = board.querySelector("svg");
const PAD = 24;
const MIN = 0.1, MAX = 8;
const nodeIds = new Set((payload.nodes || []).map((n) => n.id));
const edgeIds = new Set((payload.edges || []).map((e) => e.id));
const nodeById = new Map((payload.nodes || []).map((n) => [n.id, n]));
const viewById = new Map((payload.views || []).map((v) => [v.id, v]));
Object.freeze(payload);
if (payload.document) Object.freeze(payload.document);
Object.freeze(payload.nodes || []);
Object.freeze(payload.edges || []);
Object.freeze(payload.views || []);
let scale = 1, x = 0, y = 0, dragging = false, last = {x:0,y:0};
let reachMode = "off";
let focusId = null;
let storyId = "";
let storyStep = 0;
let lens = "";

function buildIndex(edges) {
  const down = new Map();
  const up = new Map();
  function add(map, from, hop) {
    if (from === hop.nodeId) return;
    const list = map.get(from) || [];
    list.push(hop);
    map.set(from, list);
  }
  for (const edge of edges) {
    if (edge.direction === "forward") {
      add(down, edge.source, { nodeId: edge.target, edgeId: edge.id });
      add(up, edge.target, { nodeId: edge.source, edgeId: edge.id });
    } else {
      add(down, edge.source, { nodeId: edge.target, edgeId: edge.id });
      add(down, edge.target, { nodeId: edge.source, edgeId: edge.id });
      add(up, edge.source, { nodeId: edge.target, edgeId: edge.id });
      add(up, edge.target, { nodeId: edge.source, edgeId: edge.id });
    }
  }
  return { down, up };
}
const index = buildIndex(payload.edges || []);

function diagramSize() {
  return { w: Number(svg.getAttribute("width")) || svg.viewBox.baseVal.width || 1, h: Number(svg.getAttribute("height")) || svg.viewBox.baseVal.height || 1 };
}
function apply() {
  board.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
  if (zoomLabel) zoomLabel.textContent = Math.round(scale * 100) + "%";
}
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
function focusRead() {
  if (focusId) {
    scale = Math.max(12 / 14, scale);
    focusNode(focusId);
    return;
  }
  const size = diagramSize();
  const availW = Math.max(1, stage.clientWidth - 2 * PAD);
  const availH = Math.max(1, stage.clientHeight - 2 * PAD);
  scale = clamp(Math.max(12 / 14, Math.min(availW / size.w, availH / size.h)));
  x = (stage.clientWidth - size.w * scale) / 2;
  y = (stage.clientHeight - size.h * scale) / 2;
  apply();
}
function visible() {
  const size = diagramSize();
  return x + size.w * scale > 0 && y + size.h * scale > 0 && x < stage.clientWidth && y < stage.clientHeight;
}
function nodeEl(id) { return svg.querySelector('g[data-kind="node"][data-id="' + CSS.escape(id) + '"]'); }
function focusNode(id) {
  const node = nodeEl(id);
  if (!node) return;
  const box = node.getBBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  x = stage.clientWidth / 2 - cx * scale;
  y = stage.clientHeight / 2 - cy * scale;
  apply();
  node.focus({ preventScroll: true });
}
function clearDim() {
  for (const item of document.querySelectorAll(".is-dim, .is-match")) item.classList.remove("is-dim", "is-match");
}
function setStatus(text) { if (status) status.textContent = text || ""; }
function highlight(keepNodes, keepEdges) {
  const nodes = keepNodes instanceof Set ? keepNodes : new Set(keepNodes || []);
  const edges = keepEdges instanceof Set ? keepEdges : new Set(keepEdges || []);
  for (const item of document.querySelectorAll("g[data-kind=node], g[data-kind=edge]")) {
    const id = item.getAttribute("data-id");
    const keep = item.getAttribute("data-kind") === "edge" ? edges.has(id) : nodes.has(id);
    item.classList.toggle("is-dim", !keep);
    item.classList.toggle("is-match", keep && (nodes.size + edges.size) > 0);
  }
}
function reachFrom(start, mode) {
  const hops = mode === "up" ? index.up : index.down;
  const nodes = new Set([start]);
  const edges = new Set();
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const hop of hops.get(current) || []) {
      edges.add(hop.edgeId);
      if (nodes.has(hop.nodeId)) continue;
      nodes.add(hop.nodeId);
      queue.push(hop.nodeId);
    }
  }
  return { nodes, edges };
}
function findRoute(from, to) {
  if (from === to) return { nodes: [from], edges: [] };
  const parent = new Map();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const current = queue.shift();
    for (const hop of index.down.get(current) || []) {
      if (seen.has(hop.nodeId)) continue;
      seen.add(hop.nodeId);
      parent.set(hop.nodeId, { nodeId: current, edgeId: hop.edgeId });
      if (hop.nodeId === to) { queue.length = 0; break; }
      queue.push(hop.nodeId);
    }
  }
  if (!parent.has(to)) return null;
  const nodes = [to];
  const edges = [];
  let cursor = to;
  while (cursor !== from) {
    const step = parent.get(cursor);
    if (!step) return null;
    edges.unshift(step.edgeId);
    nodes.unshift(step.nodeId);
    cursor = step.nodeId;
  }
  return { nodes, edges };
}
function fillSelect(select, selected) {
  if (!select) return;
  select.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = select.getAttribute("data-empty") || "Choose node";
  select.appendChild(blank);
  for (const node of payload.nodes || []) {
    const opt = document.createElement("option");
    opt.value = node.id;
    opt.textContent = node.label;
    if (node.id === selected) opt.selected = true;
    select.appendChild(opt);
  }
}
function currentState() {
  return {
    focus: focusId || undefined,
    reach: reachMode !== "off" ? reachMode : undefined,
    from: fromSel && fromSel.value || undefined,
    to: toSel && toSel.value || undefined,
    view: viewSel && viewSel.value || undefined,
    theme: document.documentElement.dataset.theme,
    story: storyId || undefined,
    step: storyId ? String(storyStep) : undefined,
    lens: lens || undefined
  };
}
function persist() { writeHash(currentState()); }
function writeHash(state) {
  const params = new URLSearchParams();
  if (state.focus) params.set("focus", state.focus);
  if (state.reach) params.set("reach", state.reach);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.view) params.set("view", state.view);
  if (state.theme) params.set("theme", state.theme);
  if (state.story) params.set("story", state.story);
  if (state.step) params.set("step", state.step);
  if (state.lens) params.set("lens", state.lens);
  const next = params.toString();
  const hash = next ? "#" + next : "";
  if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname + location.search);
}
function parseHash(hash) {
  const raw = (hash || "").startsWith("#") ? hash.slice(1) : hash;
  return Object.fromEntries(new URLSearchParams(raw));
}
function applyReach(id, mode) {
  if (!id || !nodeIds.has(id) || mode === "off") { clearDim(); setStatus(""); return; }
  const found = reachFrom(id, mode);
  highlight(found.nodes, found.edges);
  setStatus(mode === "up" ? "Upstream of " + id : "Downstream of " + id);
}
function applyRoute() {
  const from = fromSel.value;
  const to = toSel.value;
  if (!from || !to) return;
  if (!nodeIds.has(from) || !nodeIds.has(to)) { setStatus("No route"); return; }
  const found = findRoute(from, to);
  if (!found) { clearDim(); setStatus("No route"); persist(); return; }
  highlight(found.nodes, found.edges);
  setStatus("Route " + from + " → " + to);
  persist();
}
function applyView(id) {
  const view = viewById.get(id);
  if (!view) { clearDim(); persist(); return; }
  if (view.path && view.path.from && view.path.to) {
    fromSel.value = nodeIds.has(view.path.from) ? view.path.from : "";
    toSel.value = nodeIds.has(view.path.to) ? view.path.to : "";
    applyRoute();
    return;
  }
  const nodes = (view.nodeIds || []).filter((item) => nodeIds.has(item));
  const edges = (view.edgeIds || []).filter((item) => edgeIds.has(item));
  if (nodes.length || edges.length) highlight(nodes, edges);
  else clearDim();
  setStatus(view.name);
  persist();
}
function selectNode(id) {
  if (!nodeIds.has(id)) return;
  focusId = id;
  focusNode(id);
  if (reachMode !== "off") applyReach(id, reachMode);
  persist();
}
function resetView() {
  reachMode = "off";
  focusId = null;
  if (fromSel) fromSel.value = "";
  if (toSel) toSel.value = "";
  if (viewSel) viewSel.value = "";
  search.value = "";
  hits.classList.remove("is-open");
  hits.innerHTML = "";
  clearDim();
  setStatus("");
  persist();
}

document.querySelector("[data-act=fit]").onclick = fit;
const focusBtn = document.querySelector("[data-act=focus]");
if (focusBtn) focusBtn.onclick = focusRead;
const moreBtn = document.querySelector("[data-act=more]");
const advanced = document.querySelector("[data-advanced]");
if (moreBtn && advanced) moreBtn.onclick = () => {
  const open = advanced.classList.toggle("is-open");
  moreBtn.setAttribute("aria-expanded", String(open));
};
document.querySelector("[data-act=zoom-in]").onclick = () => { scale = clamp(scale * 1.15); apply(); };
document.querySelector("[data-act=zoom-out]").onclick = () => { scale = clamp(scale / 1.15); apply(); };
document.querySelector("[data-act=theme]").onclick = () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  persist();
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
document.querySelector("[data-act=reset]").onclick = resetView;
document.querySelector("[data-act=help]").onclick = () => document.querySelector(".help").classList.toggle("is-open");
document.querySelector("[data-act=reach-up]").onclick = () => {
  reachMode = reachMode === "up" ? "off" : "up";
  if (focusId) applyReach(focusId, reachMode); else setStatus(reachMode === "up" ? "Select a node for upstream" : "");
  persist();
};
document.querySelector("[data-act=reach-down]").onclick = () => {
  reachMode = reachMode === "down" ? "off" : "down";
  if (focusId) applyReach(focusId, reachMode); else setStatus(reachMode === "down" ? "Select a node for downstream" : "");
  persist();
};
document.querySelector("[data-act=route]").onclick = applyRoute;
if (viewSel) {
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = viewSel.getAttribute("data-empty") || "All views";
  viewSel.appendChild(blank);
  for (const view of payload.views || []) {
    const opt = document.createElement("option");
    opt.value = view.id;
    opt.textContent = view.name;
    viewSel.appendChild(opt);
  }
  viewSel.onchange = () => applyView(viewSel.value);
}
fillSelect(fromSel, "");
fillSelect(toSel, "");
const stories = payload.stories || [];
const storyById = new Map(stories.map((item) => [item.id, item]));
if (storySel) {
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = storySel.getAttribute("data-empty") || "Choose story";
  storySel.appendChild(blank);
  for (const story of stories) {
    const opt = document.createElement("option");
    opt.value = story.id;
    opt.textContent = story.name;
    storySel.appendChild(opt);
  }
}
const roles = [...new Set((payload.nodes || []).map((n) => n.role).filter(Boolean))];
if (lensSel) {
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = lensSel.getAttribute("data-empty") || "All roles";
  lensSel.appendChild(blank);
  for (const role of roles) {
    const opt = document.createElement("option");
    opt.value = role;
    opt.textContent = role;
    lensSel.appendChild(opt);
  }
}
function applyLens(next) {
  lens = next || "";
  if (lensSel) lensSel.value = lens;
  for (const node of document.querySelectorAll("g[data-kind=node]")) {
    const role = node.getAttribute("data-role") || "";
    node.classList.toggle("is-dim", Boolean(lens) && role !== lens);
  }
  persist();
}
function applyStoryStep() {
  const story = storyById.get(storyId);
  if (!story || !story.steps || !story.steps[storyStep]) { persist(); return; }
  const step = story.steps[storyStep];
  if (step.viewId) applyView(step.viewId);
  if (step.nodeId && nodeIds.has(step.nodeId)) {
    focusId = step.nodeId;
    selectNode(step.nodeId);
  }
  setStatus(step.name + (step.description ? " — " + step.description : ""));
  persist();
}
function moveStory(delta) {
  const story = storyById.get(storyId);
  if (!story) return;
  const next = storyStep + delta;
  if (next < 0 || next >= story.steps.length) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  storyStep = next;
  if (!reduce) applyStoryStep();
  else applyStoryStep();
}
if (storySel) storySel.onchange = () => {
  storyId = storySel.value;
  storyStep = 0;
  applyStoryStep();
};
const prevBtn = document.querySelector("[data-act=story-prev]");
const nextBtn = document.querySelector("[data-act=story-next]");
if (prevBtn) prevBtn.onclick = () => moveStory(-1);
if (nextBtn) nextBtn.onclick = () => moveStory(1);
if (lensSel) lensSel.onchange = () => applyLens(lensSel.value);
const lensReset = document.querySelector("[data-act=lens-reset]");
if (lensReset) lensReset.onclick = () => applyLens("");
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
    const meta = nodeById.get(id);
    const hit = !q || Boolean(meta && (meta.label + " " + meta.kind).toLowerCase().includes(q));
    node.classList.toggle("is-match", Boolean(q && hit));
    node.classList.toggle("is-dim", Boolean(q && !hit));
    if (q && hit && meta) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = meta.label + " (" + meta.kind + ")";
      button.onclick = () => selectNode(id);
      item.appendChild(button);
      hits.appendChild(item);
    }
  }
});
document.querySelectorAll("g[data-kind=node]").forEach((node) => {
  const activate = (e) => {
    e.stopPropagation();
    const id = node.getAttribute("data-id");
    selectNode(id);
    if (reachMode === "off") {
      const related = new Set([id]);
      const relatedEdges = new Set();
      for (const hop of (index.down.get(id) || []).concat(index.up.get(id) || [])) {
        related.add(hop.nodeId);
        relatedEdges.add(hop.edgeId);
      }
      highlight(related, relatedEdges);
    }
  };
  node.addEventListener("click", activate);
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(e); }
  });
});
stage.addEventListener("click", (e) => { if (e.target === stage || e.target === board || e.target === svg) resetView(); });
window.addEventListener("keydown", (e) => {
  if (e.target === search || e.target.tagName === "SELECT" || e.target.tagName === "INPUT") {
    if (e.key === "Escape") { search.blur(); hits.classList.remove("is-open"); }
    return;
  }
  if (e.key === "/") { e.preventDefault(); search.focus(); }
  if (e.key === "f") fit();
  if (e.key === "Escape") resetView();
  if (e.key === "?") document.querySelector(".help").classList.toggle("is-open");
  if (e.key === "+" || e.key === "=") { scale = clamp(scale * 1.15); apply(); }
  if (e.key === "-") { scale = clamp(scale / 1.15); apply(); }
  if (e.key === "ArrowLeft") { x += 40; apply(); }
  if (e.key === "ArrowRight") { x -= 40; apply(); }
  if (e.key === "ArrowUp") { y += 40; apply(); }
  if (e.key === "ArrowDown") { y -= 40; apply(); }
  if (e.key === "[") moveStory(-1);
  if (e.key === "]") moveStory(1);
});
window.addEventListener("resize", () => { if (!visible()) fit(); });
window.addEventListener("hashchange", () => restore(parseHash(location.hash)));
function restore(state) {
  if (state.theme === "dark" || state.theme === "light") document.documentElement.dataset.theme = state.theme;
  if (state.view && viewSel) { viewSel.value = state.view; applyView(state.view); }
  if (state.from && fromSel && nodeIds.has(state.from)) fromSel.value = state.from;
  if (state.to && toSel && nodeIds.has(state.to)) toSel.value = state.to;
  if (state.from && state.to) applyRoute();
  reachMode = state.reach === "up" || state.reach === "down" ? state.reach : "off";
  if (state.focus && nodeIds.has(state.focus)) {
    focusId = state.focus;
    focusNode(state.focus);
    if (reachMode !== "off") applyReach(state.focus, reachMode);
  } else if (state.focus) {
    focusId = null;
  }
  if (state.lens) applyLens(state.lens);
  if (state.story && storyById.has(state.story)) {
    storyId = state.story;
    if (storySel) storySel.value = storyId;
    storyStep = Math.max(0, Number(state.step) || 0);
    applyStoryStep();
  }
  persist();
}
fit();
restore(parseHash(location.hash));
`;
}
