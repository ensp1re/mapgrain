import { INTER_LATIN_500_WOFF2_BASE64 } from "./constants/interWoff2.ts";

export const EXPORT_FONT_FAMILY = "Inter";
export const EXPORT_FONT_WEIGHT = 500;

export function interFontFaceCss(): string {
  return `@font-face{font-family:${EXPORT_FONT_FAMILY};font-weight:${EXPORT_FONT_WEIGHT};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${INTER_LATIN_500_WOFF2_BASE64}) format("woff2");}`;
}

export function interFontFileUrl(): URL {
  return new URL("../fonts/inter-latin-500-normal.woff2", import.meta.url);
}

export function interRasterFontFileUrl(): URL {
  return new URL("../fonts/inter-latin-500-normal.ttf", import.meta.url);
}
