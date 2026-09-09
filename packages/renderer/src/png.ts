import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { EXPORT_FONT_FAMILY, interRasterFontFileUrl } from "./font.ts";

export { DEFAULT_SCALE } from "./constants/export.ts";
export { rasterLimits } from "./limits.ts";

export interface RasterImage {
  png: Uint8Array;
  pixels: Uint8Array;
  width: number;
  height: number;
}

export function rasterizeSvg(svg: string, scale: number, background?: string): RasterImage {
  const fontFile = fileURLToPath(interRasterFontFileUrl());
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    background,
    font: {
      loadSystemFonts: false,
      fontFiles: [fontFile],
      defaultFontFamily: EXPORT_FONT_FAMILY,
      sansSerifFamily: EXPORT_FONT_FAMILY,
    },
  });
  const image = resvg.render();
  return {
    png: new Uint8Array(image.asPng()),
    pixels: new Uint8Array(image.pixels),
    width: image.width,
    height: image.height,
  };
}

export function svgToPng(svg: string, scale: number, background?: string): Uint8Array {
  return rasterizeSvg(svg, scale, background).png;
}

export function pixelAt(
  pixels: Uint8Array,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const index = (y * width + x) * 4;
  return [pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0, pixels[index + 3] ?? 0];
}

export function parseHexRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

export function rasterHasPaint(
  pixels: Uint8Array,
  expected: readonly [number, number, number],
  tolerance = 24,
  step = 4,
): boolean {
  for (let i = 0; i < pixels.length; i += step) {
    const sample: [number, number, number] = [
      pixels[i] ?? 0,
      pixels[i + 1] ?? 0,
      pixels[i + 2] ?? 0,
    ];
    if (colorNear(sample, expected, tolerance)) return true;
  }
  return false;
}

export function colorNear(
  actual: readonly [number, number, number],
  expected: readonly [number, number, number],
  tolerance = 12,
): boolean {
  return (
    Math.abs(actual[0] - expected[0]) <= tolerance &&
    Math.abs(actual[1] - expected[1]) <= tolerance &&
    Math.abs(actual[2] - expected[2]) <= tolerance
  );
}
