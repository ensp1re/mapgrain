# Document fields

Authoritative schema: [document.schema.json](document.schema.json) in this skill directory.

Required document keys: `schemaVersion` (1), `id`, `revision`, `kind` (`architecture` | `workflow`), `title`, `nodes`, `edges`, `groups`, `views`, `layoutHints`, `theme` (`dark` | `light`).

Node `kind`: `service`, `datastore`, `queue`, `gateway`, `actor`, `system`, `job`, `external`.

Edge `type`: `calls`, `reads`, `writes`, `publishes`, `subscribes`, `depends-on`.

Edge `direction`: `forward`, `both`, `none`.

Optional `layout.positions` is keyed by node id. Optional `evidence[]` uses `targetKind` `node` | `edge` | `group` and `state` `observed` | `asserted` | `inferred`. Optional `path`, `location`, `snapshot` (sha256), and `revision` (40-character Git commit SHA) record a source pin. A snapshot match is not Git verification.
