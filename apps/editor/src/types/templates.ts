import type { DiagramDocument } from "@mapgrain/document";
import type { TemplateCategory } from "../constants/templates.ts";

export interface TemplateSpec {
  id: string;
  category: TemplateCategory;
  title: string;
  /** One line on what this template is for. */
  blurb: string;
  tags: string[];
  document: DiagramDocument;
}
