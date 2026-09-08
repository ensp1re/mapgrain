export {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_MAX_LABEL_WIDTH,
  KIND_FONT_SIZE,
  KIND_LINE_HEIGHT,
} from "./constants/metrics.ts";
export { buildScene } from "./build.ts";
export { defaultSceneOptions } from "./options.ts";
export { facingSide, placePortsOnRect, portOffset } from "./ports.ts";
export { edgeCaption } from "./caption.ts";
export {
  mapScenePolyline,
  placeEdgeLabel,
  pointAlongPolyline,
  polylineLength,
  polylinePath,
  roundedPolylinePath,
} from "./routes.ts";
export {
  approximateTextMeasurer,
  cachedTextMeasurer,
  defaultFont,
  fontTextMeasurer,
  measureText,
} from "./text.ts";
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
