import { THEME, validateDocument, type Theme } from "@mapgrain/document";
import { EXPORT_FORMAT, exportVector } from "@mapgrain/renderer";
import { wrapViewer } from "./html.ts";

export interface ViewResult {
  ok: true;
  svg: string;
  html: string;
}

export function renderView(
  document: unknown,
  theme?: Theme,
): ViewResult | { ok: false; errors: Array<{ code: string; message: string; path: string }> } {
  const exported = exportVector({
    document,
    format: EXPORT_FORMAT.SVG,
    theme,
  });
  if (!exported.ok) return exported;
  const svg = new TextDecoder().decode(exported.bytes);
  const title =
    typeof document === "object" && document && "title" in document && typeof document.title === "string"
      ? document.title
      : "Mapgrain";
  const background = (theme ?? THEME.DARK) === THEME.LIGHT ? "#f4f1ea" : "#1c1c1f";
  const validated = validateDocument(document);
  const payload = {
    document: validated.ok
      ? { ...validated.document, evidence: undefined }
      : { title },
    nodes: validated.ok
      ? validated.document.nodes.map((node) => ({ id: node.id, label: node.label, kind: node.kind }))
      : [],
    edges: validated.ok
      ? validated.document.edges.map((edge) => ({
          id: edge.id,
          source: edge.source.nodeId,
          target: edge.target.nodeId,
        }))
      : [],
  };
  return { ok: true, svg, html: wrapViewer(title, svg, JSON.stringify(payload), background) };
}
