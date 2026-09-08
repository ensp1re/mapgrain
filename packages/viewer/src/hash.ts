import { REACH_MODE } from "./constants/view.ts";
import type { ReachMode, ViewerHashState } from "./types/view.ts";

const REACH_VALUES = new Set<string>(Object.values(REACH_MODE));

export function parseViewHash(hash: string): ViewerHashState {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const state: ViewerHashState = {};
  const focus = params.get("focus");
  const reach = params.get("reach");
  const from = params.get("from");
  const to = params.get("to");
  const view = params.get("view");
  const theme = params.get("theme");
  const story = params.get("story");
  const step = params.get("step");
  const lens = params.get("lens");
  const lang = params.get("lang");
  if (focus) state.focus = focus;
  if (reach && REACH_VALUES.has(reach)) state.reach = reach as ReachMode;
  if (from) state.from = from;
  if (to) state.to = to;
  if (view) state.view = view;
  if (theme === "dark" || theme === "light") state.theme = theme;
  if (story) state.story = story;
  if (step) state.step = step;
  if (lens) state.lens = lens;
  if (lang) state.lang = lang;
  return state;
}

export function serializeViewHash(state: ViewerHashState): string {
  const params = new URLSearchParams();
  if (state.focus) params.set("focus", state.focus);
  if (state.reach && state.reach !== REACH_MODE.OFF) params.set("reach", state.reach);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.view) params.set("view", state.view);
  if (state.theme) params.set("theme", state.theme);
  if (state.story) params.set("story", state.story);
  if (state.step) params.set("step", state.step);
  if (state.lens) params.set("lens", state.lens);
  if (state.lang) params.set("lang", state.lang);
  const encoded = params.toString();
  return encoded ? `#${encoded}` : "";
}

export function knownId(id: string | undefined, ids: Set<string>): string | undefined {
  if (!id) return undefined;
  return ids.has(id) ? id : undefined;
}
