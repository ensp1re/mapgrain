import { DOCUMENT_KIND, EDGE_TYPE, NODE_KIND } from "@mapgrain/document";
import { TEMPLATE_CATEGORY } from "../../constants/templates.ts";
import type { TemplateSpec } from "../../types/templates.ts";
import { template } from "../build.ts";

const category = TEMPLATE_CATEGORY.SEQUENCE;
const kind = DOCUMENT_KIND.SEQUENCE;
const reply = EDGE_TYPE.REPLY;

// Participants sit in a row and messages stack by order, both owned by the sequence engine.
export const SEQUENCE_TEMPLATES: TemplateSpec[] = [
  {
    id: "oauth-login",
    category,
    title: "OAuth sign-in",
    blurb: "Authorization code flow, from the redirect to the session cookie.",
    tags: ["oauth", "oidc", "login", "auth"],
    document: template({
      id: "tpl-oauth-login",
      title: "OAuth sign-in",
      kind,
      viewName: "Sign-in",
      nodes: [
        { id: "browser", kind: NODE_KIND.PARTICIPANT, label: "Browser" },
        { id: "app", kind: NODE_KIND.PARTICIPANT, label: "Application" },
        { id: "idp", kind: NODE_KIND.PARTICIPANT, label: "Identity provider" },
      ],
      edges: [
        { from: "browser", to: "app", order: 1, label: "open protected page" },
        { from: "app", to: "browser", order: 2, type: reply, label: "redirect to provider" },
        { from: "browser", to: "idp", order: 3, label: "authorize" },
        { from: "idp", to: "browser", order: 4, type: reply, label: "code" },
        { from: "browser", to: "app", order: 5, label: "callback with code" },
        { from: "app", to: "idp", order: 6, label: "exchange code" },
        { from: "idp", to: "app", order: 7, type: reply, label: "id and access token" },
        { from: "app", to: "browser", order: 8, type: reply, label: "session cookie" },
      ],
    }),
  },
  {
    id: "cache-fallback",
    category,
    title: "Read-through cache",
    blurb: "A hit, a miss and the fill that follows it.",
    tags: ["cache", "api", "read-through"],
    document: template({
      id: "tpl-cache-fallback",
      title: "Read-through cache",
      kind,
      viewName: "Read path",
      nodes: [
        { id: "client", kind: NODE_KIND.PARTICIPANT, label: "Client" },
        { id: "api", kind: NODE_KIND.PARTICIPANT, label: "API" },
        { id: "cache", kind: NODE_KIND.PARTICIPANT, label: "Cache" },
        { id: "db", kind: NODE_KIND.PARTICIPANT, label: "Database" },
      ],
      edges: [
        { from: "client", to: "api", order: 1, label: "GET /product/42" },
        { from: "api", to: "cache", order: 2, label: "get product:42" },
        { from: "cache", to: "api", order: 3, type: reply, label: "miss" },
        { from: "api", to: "db", order: 4, label: "select product 42" },
        { from: "db", to: "api", order: 5, type: reply, label: "row" },
        { from: "api", to: "cache", order: 6, label: "set product:42 ttl 60s" },
        { from: "api", to: "client", order: 7, type: reply, label: "200 product" },
      ],
    }),
  },
  {
    id: "payment-authorization",
    category,
    title: "Payment authorization",
    blurb: "Authorize, capture and the webhook that confirms it.",
    tags: ["payment", "checkout", "webhook"],
    document: template({
      id: "tpl-payment-authorization",
      title: "Payment authorization",
      kind,
      viewName: "Payment",
      nodes: [
        { id: "shopper", kind: NODE_KIND.PARTICIPANT, label: "Shopper" },
        { id: "checkout", kind: NODE_KIND.PARTICIPANT, label: "Checkout service" },
        { id: "psp", kind: NODE_KIND.PARTICIPANT, label: "Payment provider" },
        { id: "ledger", kind: NODE_KIND.PARTICIPANT, label: "Ledger" },
      ],
      edges: [
        { from: "shopper", to: "checkout", order: 1, label: "place order" },
        { from: "checkout", to: "psp", order: 2, label: "authorize 49.00" },
        { from: "psp", to: "checkout", order: 3, type: reply, label: "authorized" },
        { from: "checkout", to: "ledger", order: 4, label: "reserve funds" },
        { from: "checkout", to: "shopper", order: 5, type: reply, label: "order accepted" },
        { from: "psp", to: "checkout", order: 6, label: "webhook: captured" },
        { from: "checkout", to: "ledger", order: 7, label: "settle" },
      ],
    }),
  },
  {
    id: "retry-backoff",
    category,
    title: "Retry with backoff",
    blurb: "A call that fails, waits and succeeds, including the self-call that waits.",
    tags: ["retry", "backoff", "resilience"],
    document: template({
      id: "tpl-retry-backoff",
      title: "Retry with backoff",
      kind,
      viewName: "Retry",
      nodes: [
        { id: "caller", kind: NODE_KIND.PARTICIPANT, label: "Caller" },
        { id: "client", kind: NODE_KIND.PARTICIPANT, label: "HTTP client" },
        { id: "upstream", kind: NODE_KIND.PARTICIPANT, label: "Upstream service" },
      ],
      edges: [
        { from: "caller", to: "client", order: 1, label: "send request" },
        { from: "client", to: "upstream", order: 2, label: "attempt 1" },
        { from: "upstream", to: "client", order: 3, type: reply, label: "503" },
        { from: "client", to: "client", order: 4, label: "wait 200ms" },
        { from: "client", to: "upstream", order: 5, label: "attempt 2" },
        { from: "upstream", to: "client", order: 6, type: reply, label: "200" },
        { from: "client", to: "caller", order: 7, type: reply, label: "result" },
      ],
    }),
  },
];
