export {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_MAX_LABEL_WIDTH,
} from "./constants/metrics.ts";
export { buildScene } from "./build.ts";
export { defaultSceneOptions } from "./options.ts";
export { facingSide, placePortsOnRect, portOffset } from "./ports.ts";
export { approximateTextMeasurer, defaultFont, measureText } from "./text.ts";
export type { Point, Rect, Size } from "./types/geometry.ts";
export type { FontSpec, SceneOptions, TextMeasurer } from "./types/options.ts";
export type {
  MeasuredText,
  Scene,
  SceneEdge,
  SceneGroup,
  SceneNode,
  ScenePort,
  SceneResult,
  TextLine,
} from "./types/scene.ts";
