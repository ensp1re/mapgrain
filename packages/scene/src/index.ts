export {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_MAX_LABEL_WIDTH,
  ICON_GAP,
  ICON_SIZE,
  KIND_FONT_SIZE,
  KIND_LETTER_SPACING_EM,
  KIND_LINE_HEIGHT,
  KIND_TITLE_GAP,
} from "./constants/metrics.ts";
export { BLOCKING_GEOMETRY, DIAGNOSTIC_SEVERITY, GEOMETRY_DIAGNOSTIC } from "./constants/diagnostics.ts";
export { diagnoseGeometry } from "./diagnostics.ts";
export { overlappingIds, localOverlapRepair } from "./collision.ts";
export { rectsOverlap } from "./geometry.ts";
export { iconMarkup, iconShapesFor, ICON_VIEWBOX } from "./icons.ts";
export { iconSizeFor, KIND_ORDER, kindDisplayText, kindFontFor, kindLegendLabel, presentKinds } from "./kind.ts";
export { STATE_FAIL_PATTERN, STATE_TONE, STATE_WAIT_PATTERN } from "./constants/state.ts";
export { stateTone } from "./stateTone.ts";
export type { StateTone } from "./constants/state.ts";
export { presentationCssVars, presentationFromOptions } from "./presentation.ts";
export { buildScene } from "./build.ts";
export { applyWorkflowLanes, LANE_ROLE } from "./lanes.ts";
export { isSequenceDocument, sequenceMessageY, sequencePositions } from "./sequence.ts";
export { isWorkflowLanesDocument, workflowLanePositions } from "./workflow.ts";
export { defaultSceneOptions } from "./options.ts";
export { presetOverrides } from "./presets.ts";
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
export type { GeometryDiagnostic } from "./diagnostics.ts";
export type { Point, Rect, Size } from "./types/geometry.ts";
export type { FontSpec, SceneOptions, TextMeasurer } from "./types/options.ts";
export type { IconShape } from "./icons.ts";
export type {
  MeasuredText,
  Scene,
  SceneEdge,
  SceneFragment,
  SceneFragmentOperand,
  SceneGroup,
  SceneLifeline,
  SceneNode,
  ScenePort,
  ScenePresentation,
  SceneResult,
  TextLine,
} from "./types/scene.ts";
