import { DOCUMENT_KIND, EDGE_TYPE, NODE_KIND } from "@mapgrain/document";
import { TEMPLATE_CATEGORY } from "../../constants/templates.ts";
import type { TemplateSpec } from "../../types/templates.ts";
import { template } from "../build.ts";

const category = TEMPLATE_CATEGORY.DATA;
const kind = DOCUMENT_KIND.DATA_FLOW;

export const DATA_TEMPLATES: TemplateSpec[] = [
  {
    id: "etl-pipeline",
    category,
    title: "ETL pipeline",
    blurb: "Source to warehouse, with the quarantine that catches bad rows.",
    tags: ["etl", "pipeline", "warehouse"],
    document: template({
      id: "tpl-etl-pipeline",
      title: "ETL pipeline",
      kind,
      viewName: "Pipeline",
      nodes: [
        { id: "crm", kind: NODE_KIND.ENTITY, label: "CRM export", at: [0, 0] },
        { id: "events", kind: NODE_KIND.ENTITY, label: "Product events", at: [0, 1] },
        { id: "extract", kind: NODE_KIND.PROCESS, label: "Extract", at: [1, 0] },
        { id: "validate", kind: NODE_KIND.PROCESS, label: "Validate rows", at: [2, 0] },
        { id: "transform", kind: NODE_KIND.PROCESS, label: "Transform", at: [3, 0] },
        { id: "quarantine", kind: NODE_KIND.DATASTORE, label: "Quarantine", at: [2, 1] },
        { id: "warehouse", kind: NODE_KIND.DATASTORE, label: "Warehouse", at: [4, 0] },
        { id: "analyst", kind: NODE_KIND.ENTITY, label: "Analyst", at: [5, 0] },
      ],
      edges: [
        { from: "crm", to: "extract", label: "nightly csv" },
        { from: "events", to: "extract", label: "hourly json" },
        { from: "extract", to: "validate", label: "raw rows" },
        { from: "validate", to: "transform", label: "clean rows" },
        { from: "validate", to: "quarantine", type: EDGE_TYPE.WRITES, label: "rejected rows" },
        { from: "transform", to: "warehouse", type: EDGE_TYPE.WRITES, label: "facts" },
        { from: "warehouse", to: "analyst", type: EDGE_TYPE.READS, label: "reports" },
      ],
    }),
  },
  {
    id: "event-fanout",
    category,
    title: "Event fan-out",
    blurb: "One published event, three consumers with three different jobs.",
    tags: ["events", "pubsub", "fan-out"],
    document: template({
      id: "tpl-event-fanout",
      title: "Event fan-out",
      kind,
      viewName: "Fan-out",
      nodes: [
        { id: "checkout", kind: NODE_KIND.ENTITY, label: "Checkout service", at: [0, 1] },
        { id: "publish", kind: NODE_KIND.PROCESS, label: "Publish order.placed", at: [1, 1] },
        { id: "log", kind: NODE_KIND.DATASTORE, label: "Event log", at: [2, 1] },
        { id: "invoice", kind: NODE_KIND.PROCESS, label: "Raise invoice", at: [3, 0] },
        { id: "fulfil", kind: NODE_KIND.PROCESS, label: "Reserve stock", at: [3, 1] },
        { id: "analytics", kind: NODE_KIND.PROCESS, label: "Update metrics", at: [3, 2] },
        { id: "metrics", kind: NODE_KIND.DATASTORE, label: "Metrics store", at: [4, 2] },
      ],
      edges: [
        { from: "checkout", to: "publish", label: "order accepted" },
        { from: "publish", to: "log", type: EDGE_TYPE.WRITES, label: "order.placed" },
        { from: "log", to: "invoice", type: EDGE_TYPE.READS, label: "order.placed" },
        { from: "log", to: "fulfil", type: EDGE_TYPE.READS, label: "order.placed" },
        { from: "log", to: "analytics", type: EDGE_TYPE.READS, label: "order.placed" },
        { from: "analytics", to: "metrics", type: EDGE_TYPE.WRITES, label: "daily totals" },
      ],
    }),
  },
  {
    id: "er-schema",
    category,
    title: "Entity relationships",
    blurb: "The tables behind an order, and which way each relationship points.",
    tags: ["er", "database", "schema", "model"],
    document: template({
      id: "tpl-er-schema",
      title: "Entity relationships",
      kind,
      viewName: "Schema",
      nodes: [
        { id: "customer", kind: NODE_KIND.DATASTORE, label: "customer", at: [0, 1] },
        { id: "address", kind: NODE_KIND.DATASTORE, label: "address", at: [0, 2] },
        { id: "order", kind: NODE_KIND.DATASTORE, label: "order", at: [1, 1] },
        { id: "orderline", kind: NODE_KIND.DATASTORE, label: "order_line", at: [2, 1] },
        { id: "product", kind: NODE_KIND.DATASTORE, label: "product", at: [3, 1] },
        { id: "payment", kind: NODE_KIND.DATASTORE, label: "payment", at: [1, 0] },
      ],
      edges: [
        { from: "customer", to: "order", type: EDGE_TYPE.WRITES, label: "one to many" },
        { from: "customer", to: "address", type: EDGE_TYPE.WRITES, label: "one to many" },
        { from: "order", to: "orderline", type: EDGE_TYPE.WRITES, label: "one to many" },
        { from: "product", to: "orderline", type: EDGE_TYPE.WRITES, label: "one to many" },
        { from: "order", to: "payment", type: EDGE_TYPE.WRITES, label: "one to one" },
      ],
    }),
  },
  {
    id: "pii-boundary",
    category,
    title: "Personal data boundary",
    blurb: "Where identifying fields enter, where they are stripped and what leaves.",
    tags: ["pii", "privacy", "gdpr", "boundary"],
    document: template({
      id: "tpl-pii-boundary",
      title: "Personal data boundary",
      kind,
      viewName: "Personal data",
      nodes: [
        { id: "signup", kind: NODE_KIND.ENTITY, label: "Sign-up form", at: [0, 0] },
        { id: "intake", kind: NODE_KIND.PROCESS, label: "Intake", at: [1, 0] },
        { id: "identity", kind: NODE_KIND.DATASTORE, label: "Identity store", at: [2, 0] },
        { id: "pseudonymise", kind: NODE_KIND.PROCESS, label: "Pseudonymise", at: [2, 1] },
        { id: "events", kind: NODE_KIND.DATASTORE, label: "Event store", at: [3, 1] },
        { id: "vendor", kind: NODE_KIND.EXTERNAL, label: "Analytics vendor", at: [4, 1] },
        { id: "erasure", kind: NODE_KIND.PROCESS, label: "Handle erasure request", at: [1, 2] },
      ],
      edges: [
        { from: "signup", to: "intake", label: "name, email" },
        { from: "intake", to: "identity", type: EDGE_TYPE.WRITES, label: "identifying fields" },
        { from: "intake", to: "pseudonymise", label: "behaviour only" },
        { from: "pseudonymise", to: "events", type: EDGE_TYPE.WRITES, label: "hashed subject id" },
        { from: "events", to: "vendor", type: EDGE_TYPE.READS, label: "no direct identifiers" },
        { from: "erasure", to: "identity", type: EDGE_TYPE.WRITES, label: "delete subject" },
      ],
    }),
  },
];
