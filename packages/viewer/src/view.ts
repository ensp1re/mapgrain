import { THEME, validateDocument, type Theme } from "@mapgrain/document";
import { COLOR_MODE, EXPORT_FORMAT, exportVector } from "@mapgrain/renderer/vector";
import { wrapViewer } from "./html.ts";
import { localeFrom, type Locale } from "./messages.ts";

export interface ViewResult {
  ok: true;
  svg: string;
  html: string;
}

export function renderView(
  document: unknown,
  theme?: Theme,
  locale?: Locale,
): ViewResult | { ok: false; errors: Array<{ code: string; message: string; path: string }> } {
  const validated = validateDocument(document);
  const resolvedTheme = theme ?? (validated.ok ? validated.document.theme : THEME.DARK);
  const exported = exportVector({
    document,
    format: EXPORT_FORMAT.SVG,
    theme: resolvedTheme,
    colorMode: COLOR_MODE.THEMED,
  });
  if (!exported.ok) return exported;
  const svg = new TextDecoder().decode(exported.bytes);
  const title =
    typeof document === "object" && document && "title" in document && typeof document.title === "string"
      ? document.title
      : "Mapgrain";
  const background = resolvedTheme === THEME.LIGHT ? "#f4f1ea" : "#1c1c1f";
  const payload = {
    document: validated.ok
      ? { ...validated.document, evidence: undefined }
      : { title },
    nodes: validated.ok
      ? validated.document.nodes.map((node) => ({
          id: node.id,
          label: node.label,
          kind: node.kind,
          role: node.role,
        }))
      : [],
    edges: validated.ok
      ? validated.document.edges.map((edge) => ({
          id: edge.id,
          source: edge.source.nodeId,
          target: edge.target.nodeId,
          direction: edge.direction,
        }))
      : [],
    views: validated.ok
      ? validated.document.views.map((view) => ({
          id: view.id,
          kind: view.kind,
          name: view.name,
          nodeIds: view.nodeIds,
          edgeIds: view.edgeIds,
          path: view.path,
        }))
      : [],
    stories: validated.ok ? validated.document.stories ?? [] : [],
  };
  return {
    ok: true,
    svg,
    html: wrapViewer(
      title,
      svg,
      JSON.stringify(payload),
      background,
      resolvedTheme,
      localeFrom(locale),
    ),
  };
}
