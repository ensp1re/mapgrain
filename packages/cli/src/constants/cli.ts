export const CLI_COMMAND = {
  HELP: "help",
  VERSION: "version",
  VALIDATE: "validate",
  RENDER: "render",
  EXPORT: "export",
  VIEW: "view",
  LAYOUT: "layout",
  DOCTOR: "doctor",
  DIAGNOSE: "diagnose",
  COMPARE: "compare",
  WATCH: "watch",
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
  "Usage: mapgrain <validate|render|export|view|layout|doctor|diagnose|compare|watch|studio> [file] [--format json|svg|png|html|card|video] [-o file] [--no-clobber] [--rearrange] [--view id] [--lang en|uk]";

export const HELP_TEXT = `Mapgrain — validate, render, and export architecture diagrams.

Usage:
  mapgrain <command> [file] [options]
  mapgrain --help
  mapgrain --version

Commands:
  validate   Check a diagram JSON document
  render     Write SVG to stdout or --out
  export     Write json|svg|png|html|card|video via --format
  view       Write a read-only HTML viewer
  layout     Resolve node positions with ELK and write JSON
  doctor     Check runtime, assets, renderer, worker, and output access
  diagnose   Report geometry warnings for a laid-out document
  compare    Show added/removed/changed nodes and edges between two files
  watch      Reload a file; keep last-good output while it is invalid
  studio     Serve the editor on loopback for one file

Options:
  -o, --out <file>     Output path (atomic replace)
  -f, --format <fmt>   json, svg, png, html, card, or video
      --view <id>      Named view for share-card export
      --lang en|uk     Viewer chrome locale
      --rearrange      Re-run layout even when positions already exist
      --no-clobber     Refuse to overwrite an existing --out file
  -h, --help
  -v, --version

Input:
  Pass a file path, or - to read stdin. Maximum size is 8 MiB.

Overwrite:
  -o writes a unique sibling .tmp file and renames it over the destination.
  On failure the previous file is left in place and the temp file is removed.

Studio:
  Binds 127.0.0.1 only. Writes are limited to the opened file.
  Occupied ports try the next port. Set MAPGRAIN_STUDIO_NO_OPEN=1 to skip the browser.
`;
