import { DOCUMENT_KIND, type DocumentKind } from "@mapgrain/document";

export interface ModeChoice {
  kind: DocumentKind;
  title: string;
  purpose: string;
}

export const MODE_CHOICES: ModeChoice[] = [
  {
    kind: DOCUMENT_KIND.ARCHITECTURE,
    title: "Architecture",
    purpose: "Typed components, groups, and directed connections.",
  },
  {
    kind: DOCUMENT_KIND.WORKFLOW,
    title: "Workflow",
    purpose: "Jobs, decisions, and labelled outcomes.",
  },
  {
    kind: DOCUMENT_KIND.SEQUENCE,
    title: "Sequence",
    purpose: "Participants in a row and ordered messages, including replies and self calls.",
  },
  {
    kind: DOCUMENT_KIND.DATA_FLOW,
    title: "Data flow",
    purpose: "Processes, stores, and labelled movement of data.",
  },
  {
    kind: DOCUMENT_KIND.LIFECYCLE,
    title: "Lifecycle",
    purpose: "States, initial and final markers, and guarded transitions.",
  },
];
