import { NODE_MARKER, type NodeMarker } from "@mapgrain/document";
import {
  STATE_FAIL_PATTERN,
  STATE_TONE,
  STATE_WAIT_PATTERN,
  type StateTone,
} from "./constants/state.ts";

export function stateTone(label: string, marker?: NodeMarker): StateTone {
  if (STATE_FAIL_PATTERN.test(label)) return STATE_TONE.FAIL;
  if (STATE_WAIT_PATTERN.test(label)) return STATE_TONE.WAIT;
  if (marker === NODE_MARKER.INITIAL) return STATE_TONE.START;
  if (marker === NODE_MARKER.FINAL) return STATE_TONE.DONE;
  return STATE_TONE.ACTIVE;
}
