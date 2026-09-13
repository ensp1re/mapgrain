# Document fields

Authoritative schema: [document.schema.json](document.schema.json) in this skill directory.
This page is the working summary. Where the two disagree, the JSON Schema is right.

## Every document

Required: `schemaVersion` (always `1`), `id`, `revision`, `kind`, `title`, `nodes`, `edges`,
`groups`, `views`, `layoutHints`, `theme` (`dark` | `light`).

Optional: `layout`, `preset`, `evidence[]`, `stories[]`, `fragments[]` (sequence only).

- `id` and every node, edge and group id match `^[A-Za-z][A-Za-z0-9_-]*$`.
- `revision` starts at `1` and goes up by one per successful edit.
- `layoutHints` is `{ "direction": "right" | "down", "pinnedNodeIds": [] }`.
- `views` needs at least one entry; `{ "id": "overview", "kind": "overview", "name": "All" }`
  is the usual one.

## The five kinds

`kind` is one of `architecture`, `workflow`, `sequence`, `data-flow`, `lifecycle`. Each kind
accepts its own node kinds and edge types, and rejects the others.

| kind | node `kind` | edge `type` | also uses |
| --- | --- | --- | --- |
| `architecture` | `service`, `datastore`, `queue`, `gateway`, `actor`, `system`, `job`, `external` | `calls`, `reads`, `writes`, `publishes`, `subscribes`, `depends-on` | nested `groups` |
| `workflow` | `actor`, `job`, `decision`, `system`, `gateway` | `calls`, `outcome` | top-level `groups` become lanes; `edge.outcome` |
| `sequence` | `participant`, `actor` | `message`, `reply` | `edge.order`, `fragments[]` |
| `data-flow` | `process`, `datastore`, `entity`, `external` | `data`, `reads`, `writes` | — |
| `lifecycle` | `state` | `transition` | `node.marker`, `edge.guard` |

A worked example of each: [workflow.json](../examples/workflow.json),
[sequence.json](../examples/sequence.json), [data-flow.json](../examples/data-flow.json),
[lifecycle.json](../examples/lifecycle.json), and two architecture files —
[branching.json](../examples/branching.json) without coordinates and
[ten-node.json](../examples/ten-node.json) with a portable layout.

## Node

```json
{ "id": "ingest", "kind": "process", "label": "Ingest reading", "groupId": null, "ports": [] }
```

- `label` is required and is what the card shows.
- `description` is optional, up to 4000 characters, and draws as a second line on the card.
- `groupId` is a group id or `null`.
- `ports` may be left empty. Give one only to pin which side a connection leaves from:
  `{ "id": "out", "side": "east" }`, side being `north` | `south` | `east` | `west`. The scene
  treats an authored port as a hint and uses the side that faces the other card when they
  disagree.
- `marker` is `initial` or `final`, and only means anything on a `lifecycle` state.
- `role` is an optional short string used by the viewer's role filter.

## Edge

```json
{ "id": "t1", "source": { "nodeId": "new" }, "target": { "nodeId": "triaged" },
  "type": "transition", "direction": "forward", "label": "assigned" }
```

- `direction` is `forward`, `both`, or `none`, and decides the arrowheads.
- `label` is optional; an edge without one draws no caption.
- `order` is a positive integer and orders sequence messages. Give it to every message or to
  none — mixing authored and implied orders puts two messages on the same line.
- `guard` reads as a condition on a `lifecycle` transition.
- `outcome` labels a branch out of a `workflow` decision. **Every edge leaving a decision needs
  an `outcome` or a `label`** — that is the rule most often broken. A decision with only one
  outcome is accepted, because a half-built decision has to be authorable.
- `shape` is optional: `elbow` (default), `straight`, or `curved`. It needs
  `npx mapgrain@0.2.4` or newer; older packages reject a field they have never seen.

## Sequence fragments

```json
{ "id": "known", "kind": "alt",
  "operands": [{ "label": "account exists", "startOrder": 4, "endOrder": 5 }] }
```

`opt` takes exactly one operand; `alt` takes two or more that do not overlap. Every
`startOrder` and `endOrder` must exist on a message. Architecture documents reject `fragments`.

## Layout

`layout.positions` is keyed by node id: `{ "ingest": { "x": 0, "y": 120 } }`. Omit it when
creating a document and let `mapgrain layout` write it. Keys that are not node ids are dropped.
Nothing else belongs in `layout` — no viewport, no selection, no edge waypoints.

## Evidence

`evidence[]` records where a claim came from. `targetKind` is `node` | `edge` | `group` and
`state` is `observed` (you read the file), `asserted` (a human said so), or `inferred` (you
guessed). Optional `path`, `location`, and `snapshot` (a sha256 of the file bytes) pin a
source; optional `revision` is a 40-character Git commit SHA. `diagnose` sets `verified` only
when that commit's blob matches `snapshot` — a working-tree hash match is `snapshotMatches`,
which is not the same claim. Never put a branch name in `revision`. Redact credentials.

## What gets rejected

- An unknown node kind or edge type for the document's kind.
- A duplicate id, or an edge pointing at a node that does not exist.
- A group whose parents form a cycle.
- A decision outcome with no label.
- A `schemaVersion` other than `1`.
- Any property not in the schema: `additionalProperties` is `false` everywhere.

A failed `validate` prints the code, the path, and the element id. Fix every diagnostic in one
pass rather than one at a time.
