export const DIAGRAM_FONT_SIZE = 14;
export const DIAGRAM_SECONDARY_SIZE = 12;
export const DIAGRAM_TITLE_SIZE = 16;
export const READING_LABEL_SIZE = 12;
export const FIT_PADDING = 0.16;
export const USER_MIN_ZOOM = 0.25;
export const USER_MAX_ZOOM = 2.5;
export const MIN_READABLE_ZOOM = READING_LABEL_SIZE / DIAGRAM_FONT_SIZE;

export function readableFitOptions(): { padding: number; minZoom: number; maxZoom: number } {
  return { padding: FIT_PADDING, minZoom: MIN_READABLE_ZOOM, maxZoom: USER_MAX_ZOOM };
}

export function fitAllOptions(): { padding: number; minZoom: number; maxZoom: number } {
  return { padding: FIT_PADDING, minZoom: USER_MIN_ZOOM, maxZoom: USER_MAX_ZOOM };
}

export function effectiveLabelSize(fontSize: number, zoom: number): number {
  return fontSize * zoom;
}
