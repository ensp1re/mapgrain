import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_WEIGHT, ICON_GAP, KIND_TITLE_GAP } from "./constants/metrics.ts";
import { iconSizeFor, kindFontFor } from "./kind.ts";
import type { SceneOptions } from "./types/options.ts";
import type { ScenePresentation } from "./types/scene.ts";

export function presentationFromOptions(options: SceneOptions): ScenePresentation {
  const kind = kindFontFor(options.font);
  return {
    fontFamily: options.font.family || DEFAULT_FONT_FAMILY,
    titleSize: options.font.size,
    titleLineHeight: options.font.lineHeight,
    titleWeight: options.font.weight || DEFAULT_FONT_WEIGHT,
    kindSize: kind.size,
    kindLineHeight: kind.lineHeight,
    kindTrackingEm: kind.letterSpacingEm ?? 0,
    iconSize: iconSizeFor(options.font),
    iconGap: ICON_GAP,
    paddingX: options.padding.x,
    paddingY: options.padding.y,
    kindTitleGap: KIND_TITLE_GAP,
  };
}

export function presentationCssVars(presentation: ScenePresentation): Record<string, string> {
  return {
    "--node-pad-x": `${presentation.paddingX}px`,
    "--node-pad-y": `${presentation.paddingY}px`,
    "--node-title-size": `${presentation.titleSize}px`,
    "--node-title-line": `${presentation.titleLineHeight}px`,
    "--node-kind-size": `${presentation.kindSize}px`,
    "--node-kind-line": `${presentation.kindLineHeight}px`,
    "--node-kind-tracking": `${presentation.kindTrackingEm}em`,
    "--node-icon-size": `${presentation.iconSize}px`,
    "--node-icon-gap": `${presentation.iconGap}px`,
    "--node-kind-title-gap": `${presentation.kindTitleGap}px`,
  };
}
