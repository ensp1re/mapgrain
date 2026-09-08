import { Resvg } from "@resvg/resvg-js";

export { DEFAULT_SCALE } from "./constants/export.ts";
export { rasterLimits } from "./limits.ts";

export function svgToPng(svg: string, scale: number): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    font: { loadSystemFonts: true, defaultFontFamily: "sans-serif" },
  });
  return resvg.render().asPng();
}
