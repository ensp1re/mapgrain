# Document fields

Authoritative schema: `packages/cli/schema/document.v1.json` (same contract as `packages/document`).

Required document keys: `schemaVersion` (1), `id`, `revision`, `kind` (`architecture` | `workflow`), `title`, `nodes`, `edges`, `groups`, `views`, `layoutHints`, `theme` (`dark` | `light`).

Node `kind`: `service`, `datastore`, `queue`, `gateway`, `actor`, `system`, `job`, `external`.

Edge `type`: `calls`, `reads`, `writes`, `publishes`, `subscribes`, `depends-on`.

Edge `direction`: `forward`, `both`, `none`.

Optional `layout.positions` is keyed by node id. Optional `evidence[]` uses `targetKind` `node` | `edge` | `group` and `state` `observed` | `asserted` | `inferred`.
