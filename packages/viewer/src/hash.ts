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
  if (focus) state.focus = focus;
  if (reach && REACH_VALUES.has(reach)) state.reach = reach as ReachMode;
  if (from) state.from = from;
  if (to) state.to = to;
  if (view) state.view = view;
  if (theme === "dark" || theme === "light") state.theme = theme;
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
  const encoded = params.toString();
  return encoded ? `#${encoded}` : "";
}

export function knownId(id: string | undefined, ids: Set<string>): string | undefined {
  if (!id) return undefined;
  return ids.has(id) ? id : undefined;
}
