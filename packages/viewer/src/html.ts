import { VIEW_MODE } from "./constants/view.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function wrapViewer(title: string, svg: string, background: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <style>
    html, body { margin: 0; background: ${background}; color: inherit; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    .mapgrain-viewer { min-height: 100vh; overflow: auto; }
    .mapgrain-viewer-label { margin: 0; padding: 12px 16px; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.7; }
    svg { display: block; max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <main class="mapgrain-viewer" data-mode="${VIEW_MODE.READONLY}" aria-label="Read-only diagram">
    <p class="mapgrain-viewer-label">Read-only view</p>
    ${svg}
  </main>
</body>
</html>
`;
}
