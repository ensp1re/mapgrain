export const CLI_COMMAND = {
  HELP: "help",
  VERSION: "version",
  VALIDATE: "validate",
  RENDER: "render",
  EXPORT: "export",
  VIEW: "view",
  DOCTOR: "doctor",
  STUDIO: "studio",
} as const;

export const EXIT_CODE = {
  OK: 0,
  ERROR: 1,
  USAGE: 2,
} as const;

export const DIAGNOSTIC_CODE = {
  USAGE: "usage",
  INVALID_DOCUMENT: "invalid_document",
  IO: "io",
  TOO_LARGE: "too_large",
  NO_CLOBBER: "no_clobber",
  STUDIO: "studio",
  DOCTOR: "doctor",
} as const;

export const DOCTOR_CHECK = {
  RUNTIME: "runtime",
  ASSETS: "assets",
  WORKER: "worker",
  RENDERER: "renderer",
  OUTPUT: "output",
} as const;

export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const STUDIO_HOST = "127.0.0.1";
export const STUDIO_PORT = 4173;
export const STUDIO_PORT_TRIES = 20;
export const STUDIO_HEADER = "x-mapgrain-session";
export const STUDIO_COOKIE = "mapgrain_session";
export const STUDIO_IF_MATCH = "if-match";
export const STDIN_PATH = "-";

export const USAGE =
  "Usage: mapgrain <validate|render|export|view|doctor|studio> [file] [--format json|svg|png|html] [-o file] [--no-clobber]";

export const HELP_TEXT = `Mapgrain — validate, render, and export architecture diagrams.

Usage:
  mapgrain <command> [file] [options]
  mapgrain --help
  mapgrain --version

Commands:
  validate   Check a diagram JSON document
  render     Write SVG to stdout or --out
  export     Write json|svg|png|html via --format
  view       Write a read-only HTML viewer
  doctor     Check runtime, assets, renderer, worker, and output access
  studio     Serve the editor on loopback for one file

Options:
  -o, --out <file>     Output path (atomic replace)
  -f, --format <fmt>   json, svg, png, or html
      --no-clobber     Refuse to overwrite an existing --out file
  -h, --help
  -v, --version

Input:
  Pass a file path, or - to read stdin. Maximum size is 8 MiB.

Overwrite:
  -o writes a sibling .tmp file and renames it over the destination.
  On failure the previous file is left in place.

Studio:
  Binds 127.0.0.1 only. Writes are limited to the opened file.
  Occupied ports try the next port. Set MAPGRAIN_STUDIO_NO_OPEN=1 to skip the browser.
`;
