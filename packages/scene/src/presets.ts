import { PRESET, type Preset } from "@mapgrain/document";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_MAX_LABEL_WIDTH,
  DEFAULT_MIN_NODE_HEIGHT,
  DEFAULT_MIN_NODE_WIDTH,
  DEFAULT_NODE_PADDING_X,
  DEFAULT_NODE_PADDING_Y,
  DEFAULT_SPACING_X,
  DEFAULT_SPACING_Y,
} from "./constants/metrics.ts";
import type { SceneOptions } from "./types/options.ts";

export function presetOverrides(preset: Preset | undefined): Partial<SceneOptions> {
  if (preset === PRESET.COMPACT) {
    return {
      padding: { x: 10, y: 8 },
      minNodeWidth: 56,
      minNodeHeight: 28,
      maxLabelWidth: 180,
      spacing: { x: 40, y: 32 },
      font: {
        family: "Inter",
        size: 12,
        lineHeight: 16,
        weight: 500,
      },
    };
  }
  if (preset === PRESET.PRESENTATION) {
    return {
      padding: { x: 22, y: 16 },
      minNodeWidth: 96,
      minNodeHeight: 48,
      maxLabelWidth: 280,
      spacing: { x: 80, y: 64 },
      font: {
        family: "Inter",
        size: 16,
        lineHeight: 24,
        weight: 500,
      },
    };
  }
  return {
    padding: { x: DEFAULT_NODE_PADDING_X, y: DEFAULT_NODE_PADDING_Y },
    minNodeWidth: DEFAULT_MIN_NODE_WIDTH,
    minNodeHeight: DEFAULT_MIN_NODE_HEIGHT,
    maxLabelWidth: DEFAULT_MAX_LABEL_WIDTH,
    spacing: { x: DEFAULT_SPACING_X, y: DEFAULT_SPACING_Y },
    font: {
      family: "Inter",
      size: DEFAULT_FONT_SIZE,
      lineHeight: DEFAULT_LINE_HEIGHT,
      weight: 500,
    },
  };
}
