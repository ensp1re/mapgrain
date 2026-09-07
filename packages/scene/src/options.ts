import { LAYOUT_DIRECTION } from "@mapgrain/document";
import {
  DEFAULT_GROUP_HEADER,
  DEFAULT_GROUP_PADDING,
  DEFAULT_MAX_LABEL_WIDTH,
  DEFAULT_MIN_NODE_HEIGHT,
  DEFAULT_MIN_NODE_WIDTH,
  DEFAULT_NODE_PADDING_X,
  DEFAULT_NODE_PADDING_Y,
  DEFAULT_SPACING_X,
  DEFAULT_SPACING_Y,
} from "./constants/metrics.ts";
import { approximateTextMeasurer, defaultFont } from "./text.ts";
import type { SceneOptions } from "./types/options.ts";

export function defaultSceneOptions(overrides: Partial<SceneOptions> = {}): SceneOptions {
  return {
    font: defaultFont,
    measurer: approximateTextMeasurer,
    padding: { x: DEFAULT_NODE_PADDING_X, y: DEFAULT_NODE_PADDING_Y },
    minNodeWidth: DEFAULT_MIN_NODE_WIDTH,
    minNodeHeight: DEFAULT_MIN_NODE_HEIGHT,
    maxLabelWidth: DEFAULT_MAX_LABEL_WIDTH,
    groupPadding: DEFAULT_GROUP_PADDING,
    groupHeader: DEFAULT_GROUP_HEADER,
    spacing: { x: DEFAULT_SPACING_X, y: DEFAULT_SPACING_Y },
    direction: LAYOUT_DIRECTION.RIGHT,
    positions: {},
    ...overrides,
  };
}
