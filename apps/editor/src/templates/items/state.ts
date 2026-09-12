import { DOCUMENT_KIND, NODE_KIND, NODE_MARKER } from "@mapgrain/document";
import { TEMPLATE_CATEGORY } from "../../constants/templates.ts";
import type { TemplateSpec } from "../../types/templates.ts";
import { template } from "../build.ts";

const category = TEMPLATE_CATEGORY.STATE;
const kind = DOCUMENT_KIND.LIFECYCLE;
const state = NODE_KIND.STATE;

export const STATE_TEMPLATES: TemplateSpec[] = [
  {
    id: "order-state-machine",
    category,
    title: "Order state machine",
    blurb: "Placed to delivered, with the two ways an order ends early.",
    tags: ["state machine", "order", "commerce"],
    document: template({
      id: "tpl-order-state-machine",
      title: "Order state machine",
      kind,
      viewName: "Order",
      nodes: [
        { id: "placed", kind: state, label: "Placed", marker: NODE_MARKER.INITIAL, at: [0, 1] },
        { id: "paid", kind: state, label: "Paid", at: [1, 1] },
        { id: "packed", kind: state, label: "Packed", at: [2, 1] },
        { id: "shipped", kind: state, label: "Shipped", at: [3, 1] },
        { id: "delivered", kind: state, label: "Delivered", marker: NODE_MARKER.FINAL, at: [4, 1] },
        { id: "cancelled", kind: state, label: "Cancelled", marker: NODE_MARKER.FINAL, at: [1, 0] },
        { id: "refunded", kind: state, label: "Refunded", marker: NODE_MARKER.FINAL, at: [3, 2] },
      ],
      edges: [
        { from: "placed", to: "paid", label: "payment captured" },
        { from: "paid", to: "packed", label: "stock reserved" },
        { from: "packed", to: "shipped", label: "handed to carrier" },
        { from: "shipped", to: "delivered", label: "signed for" },
        { from: "placed", to: "cancelled", label: "cancelled", guard: "before capture" },
        { from: "paid", to: "refunded", label: "refunded", guard: "within 30 days" },
        { from: "delivered", to: "refunded", label: "returned" },
      ],
    }),
  },
  {
    id: "job-retry",
    category,
    title: "Background job retry",
    blurb: "Queued to done, with a backoff loop and a dead letter.",
    tags: ["job", "retry", "queue", "backoff"],
    document: template({
      id: "tpl-job-retry",
      title: "Background job retry",
      kind,
      viewName: "Job",
      nodes: [
        { id: "queued", kind: state, label: "Queued", marker: NODE_MARKER.INITIAL, at: [0, 1] },
        { id: "running", kind: state, label: "Running", at: [1, 1] },
        { id: "waiting", kind: state, label: "Waiting to retry", at: [1, 2] },
        { id: "succeeded", kind: state, label: "Succeeded", marker: NODE_MARKER.FINAL, at: [2, 0] },
        { id: "failed", kind: state, label: "Failed", marker: NODE_MARKER.FINAL, at: [2, 2] },
      ],
      edges: [
        { from: "queued", to: "running", label: "picked up" },
        { from: "running", to: "succeeded", label: "completed" },
        { from: "running", to: "waiting", label: "errored", guard: "attempts < 5" },
        { from: "waiting", to: "running", label: "backoff elapsed" },
        { from: "running", to: "failed", label: "errored", guard: "attempts = 5" },
      ],
    }),
  },
  {
    id: "subscription",
    category,
    title: "Subscription lifecycle",
    blurb: "Trial through renewal, including the grace period after a failed charge.",
    tags: ["subscription", "billing", "saas"],
    document: template({
      id: "tpl-subscription",
      title: "Subscription lifecycle",
      kind,
      viewName: "Subscription",
      nodes: [
        { id: "trialing", kind: state, label: "Trialing", marker: NODE_MARKER.INITIAL, at: [0, 1] },
        { id: "active", kind: state, label: "Active", at: [1, 1] },
        { id: "pastdue", kind: state, label: "Past due", at: [2, 2] },
        { id: "paused", kind: state, label: "Paused", at: [2, 0] },
        { id: "cancelled", kind: state, label: "Cancelled", marker: NODE_MARKER.FINAL, at: [3, 1] },
      ],
      edges: [
        { from: "trialing", to: "active", label: "first charge cleared" },
        { from: "trialing", to: "cancelled", label: "trial expired", guard: "no card on file" },
        { from: "active", to: "pastdue", label: "charge failed" },
        { from: "pastdue", to: "active", label: "retry cleared", guard: "within 14 days" },
        { from: "pastdue", to: "cancelled", label: "grace period over" },
        { from: "active", to: "paused", label: "paused by customer" },
        { from: "paused", to: "active", label: "resumed" },
        { from: "active", to: "cancelled", label: "cancelled" },
      ],
    }),
  },
  {
    id: "session-lifecycle",
    category,
    title: "Session lifecycle",
    blurb: "Signed out to signed in, with the refresh that keeps it alive.",
    tags: ["session", "auth", "token"],
    document: template({
      id: "tpl-session-lifecycle",
      title: "Session lifecycle",
      kind,
      viewName: "Session",
      nodes: [
        { id: "anonymous", kind: state, label: "Anonymous", marker: NODE_MARKER.INITIAL, at: [0, 1] },
        { id: "authenticating", kind: state, label: "Authenticating", at: [1, 1] },
        { id: "active", kind: state, label: "Active", at: [2, 1] },
        { id: "refreshing", kind: state, label: "Refreshing", at: [3, 0] },
        { id: "expired", kind: state, label: "Expired", marker: NODE_MARKER.FINAL, at: [3, 2] },
      ],
      edges: [
        { from: "anonymous", to: "authenticating", label: "sign in" },
        { from: "authenticating", to: "active", label: "credentials accepted" },
        { from: "authenticating", to: "anonymous", label: "credentials rejected" },
        { from: "active", to: "refreshing", label: "token near expiry" },
        { from: "refreshing", to: "active", label: "refresh accepted" },
        { from: "refreshing", to: "expired", label: "refresh rejected" },
        { from: "active", to: "expired", label: "signed out" },
      ],
    }),
  },
];
