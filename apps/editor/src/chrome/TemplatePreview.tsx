import { useMemo } from "react";
import { COLOR_MODE, renderDocumentSvg } from "@mapgrain/renderer/vector";
import type { Theme } from "@mapgrain/document";
import type { TemplateSpec } from "../types/templates.ts";

interface TemplatePreviewProps {
  spec: TemplateSpec;
  theme: Theme;
}

/**
 * Drawn from the template's own document through the export renderer, so a card can never
 * drift from what opening it produces. Themed paints let it follow the app's palette.
 */
export function TemplatePreview({ spec, theme }: TemplatePreviewProps) {
  const svg = useMemo(() => {
    const rendered = renderDocumentSvg(spec.document, theme, COLOR_MODE.THEMED);
    return "ok" in rendered ? null : rendered.svg;
  }, [spec.document, theme]);
  if (!svg) return <div className="template-preview is-empty" aria-hidden="true" />;
  return (
    <div
      className="template-preview"
      role="img"
      aria-label={`${spec.title} preview`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
