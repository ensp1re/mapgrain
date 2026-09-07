import type { LayoutConflict } from "@mapgrain/layout/run";
import type { PositionMap } from "./editor.ts";

export type ArrangeState =
  | { status: "idle" }
  | { status: "working" }
  | { status: "preview"; positions: PositionMap }
  | { status: "conflict"; message: string; overlappingNodeIds: string[]; pins: LayoutConflict["pins"] };
