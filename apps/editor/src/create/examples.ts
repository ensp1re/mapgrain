import cycle from "../../../../tests/fixtures/documents/cycle.json" with { type: "json" };
import dataFlow from "../../../../tests/fixtures/documents/data-flow-ingest.json" with { type: "json" };
import lifecycle from "../../../../tests/fixtures/documents/lifecycle-session.json" with { type: "json" };
import nestedGroups from "../../../../tests/fixtures/documents/nested-groups.json" with { type: "json" };
import sequence from "../../../../tests/fixtures/documents/sequence-checkout.json" with { type: "json" };
import workflowReview from "../../../../tests/fixtures/documents/workflow-review.json" with { type: "json" };
import { EXAMPLE_KIND } from "../constants/create.ts";
import type { ExampleSpec } from "../types/create.ts";

export const EXAMPLES: ExampleSpec[] = [
  {
    id: "local-runtime",
    kind: EXAMPLE_KIND,
    title: "Local diagram workspace",
    blurb: "Nested groups for a local runtime, document pipeline, and renderer.",
    document: nestedGroups,
  },
  {
    id: "review-workflow",
    kind: EXAMPLE_KIND,
    title: "Review workflow",
    blurb: "Interpreting, arranging, and checking as an editable workflow diagram.",
    document: workflowReview,
  },
  {
    id: "feedback-loop",
    kind: EXAMPLE_KIND,
    title: "Feedback loop",
    blurb: "A small cycle: ingest, score, and store with a replay edge.",
    document: cycle,
  },
  {
    id: "checkout-sequence",
    kind: EXAMPLE_KIND,
    title: "Checkout messages",
    blurb: "Ordered browser, API, and ledger messages.",
    document: sequence,
  },
  {
    id: "ingest-flow",
    kind: EXAMPLE_KIND,
    title: "Ingest data flow",
    blurb: "Analyst files move through capture, records, and report.",
    document: dataFlow,
  },
  {
    id: "session-lifecycle",
    kind: EXAMPLE_KIND,
    title: "Session lifecycle",
    blurb: "Idle, active, and closed states with guarded transitions.",
    document: lifecycle,
  },
];
