# Mapgrain 0.2.1 audit — Enspire CRM

Human product audit of `npx mapgrain@0.2.1` (source `main` @ `78eef36`) using `/Users/oleksandrostapuk/hobby/financial_tracker` (Enspire CRM) as the diagram subject. The CRM was **read only**. No `.env`, no Next.js, no login, no wallets.

**Date:** 2026-09-10  
**Task:** F054  
**Pin:** `npx mapgrain@0.2.1` (do not use `@latest`)

## How this was run

1. Mapped Enspire from `ARCHITECTURE.md`, `README.md`, `prisma/schema.prisma`, `lib/api-route.ts`, and `modules/*` (explore subagent).
2. Authored five JSON documents in `docs/audit/diagrams/`, then `pnpm mapgrain validate` + `layout`.
3. Used the editor as a human (Vite `http://localhost:5173`, Playwright headless, 1440×900 and 390×844): start surface, Open file, Fit all, Help, Commands, Export, phone chrome.
4. CLI matrix in empty temp dirs (`pnpm mapgrain` and `npx mapgrain@0.2.1`).
5. Skill live run in `/tmp/mapgrain-skill-audit` following `skills/mapgrain/SKILL.md`.

Screenshots: `docs/audit/media/`. Diagrams: `docs/audit/diagrams/`.

This slice does **not** fix the product. Later fix ids are suggestions.

## Findings

| ID | Severity | Area | Kind | What happened | Expected | Repro | Screenshot | Later fix |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A-001 | blocker | export / cli | all | CLI `export --format png` and `--format card` draw node boxes and icons with **no labels**. SVG/HTML still have the text. `doctor` reports labeled PNG anyway. | PNG/card must show the same labels as SVG. Doctor must fail if labels are missing. | `pnpm mapgrain export docs/audit/diagrams/enspire-architecture.json --format png -o /tmp/arch.png` | `docs/audit/media/cli-architecture.png` vs `docs/audit/media/architecture-1440.png` | F055 |
| A-002 | high | editor | architecture | West-facing **source** ports are mounted as React Flow **targets**. Edges `e-google-auth`, `e-coinstats-modules`, `e-xscraper-modules` never appear; console: `Couldn't create edge for source handle id: "out"`. CLI SVG still draws them. | Handle type follows whether the port is used as source or target, not compass side. | Open `enspire-architecture.json` in the editor. | `docs/audit/media/architecture-1440.png` | F056 |
| A-003 | high | editor | all | Help overlay clips at Delete; Duplicate/Align/Fit are off-canvas. No scroll. | Overlay lists every `COMMANDS` row or scrolls. | Help or `?` at 1440×900. | `docs/audit/media/help-overlay-1440.png` | F057 |
| A-004 | high | editor | all | At 390px the inspector covers most of the canvas. Viewport bar shows Focus but **no Fit all control** (CSS only hides `.fit-label`). Title truncates to `Enspire C...`. | Closing Details reveals the graph; Fit all remains a control (icon-only is fine). | Import architecture, resize 390×844. | `docs/audit/media/architecture-390.png`, `architecture-390-canvas.png` | F058 |
| A-005 | medium | cli | all | `diagnose` resolves `evidence.path` with `access()` against **process cwd**. CRM-relative paths are `exists:false` from `/tmp`. From the Mapgrain repo, `README.md` is a **false positive** (Mapgrain’s README, not Enspire’s). Git `verified` needs repo-relative path + cwd = that git root. | Diagnose needs a document root / `--root`. Do not treat a stranger README as the cited file. | `pnpm mapgrain diagnose docs/audit/diagrams/enspire-architecture.json` from this repo vs a temp dir. | — | F059 |
| A-006 | medium | layout | architecture, workflow, data-flow, lifecycle | After ELK, `label_clearance` warnings on real CRM diagrams. `--strict` still exits 0 (overlap/clipping only). Skill forbids inventing x/y, so an agent cannot fix this. | Either ELK leaves readable labels, or `--strict`/skill has a legal rearrange path. | `pnpm mapgrain diagnose --strict docs/audit/diagrams/enspire-architecture.json` | `docs/audit/media/architecture-1440.png`, `lifecycle-1440.png` | F060 |
| A-007 | medium | cli | all | `export --format card --view overview` ignores missing/`overview` views with no `nodeIds` and writes the **full PNG** (same bytes). Unknown `--view` still exits 0. | Missing view id fails; card crops to the named view. | Sequence `--view overview` vs architecture `--view does-not-exist`. | `docs/audit/media/cli-architecture.png` | F061 |
| A-008 | medium | editor | all | Outline search placeholder reads as `Search component: *k`. Kind chips truncate (`PARTICIP...`, `STA...`). Long labels wrap poorly in the outline. | Search field shows `Search components` + ⌘K. Kind labels remain readable. | Any imported diagram at 1440. | `docs/audit/media/sequence-1440.png` | F062 |
| A-009 | medium | editor | sequence | Viewport bar sits on top of the last messages and the alt box (`reply · 9 · 401`). | Viewport chrome must not cover the diagram after Fit all. | Open `enspire-sequence.json`, Fit all. | `docs/audit/media/sequence-1440.png` | F063 |
| A-010 | low | editor | all | Command palette also clips the last rows (Focus). | Palette scrolls or is taller than Help. | Commands / ⌘K. | `docs/audit/media/commands-1440.png` | with F057 |
| A-011 | medium | skill | docs | `skills/mapgrain/references/schema.md` still says document `kind` is `architecture \| workflow`. Schema JSON allows five kinds. Invalid-kind CLI error is only `Expected union value` at `/kind`. | Skill docs match the five-mode CLI. Diagnostics list allowed kinds. | Skill live run: set `kind` to `sysmap`. | — | F064 |
| A-012 | gap | product | — | No ER of Prisma, no C4, no Recharts/bar/pie, no swimlanes, no DFD circles/cylinders, no BPMN/Gantt/mind map. Enspire has all of those needs. | Stay honest: these are not shipped. | Competitive table below. | — | unqueued |
| A-013 | gap | product | — | Switching kind on an existing file has no conversion preview (already an open PLAN gap). | Do not claim it. | — | — | PLAN gap |
| A-014 | low | editor | all | React Flow Pro attribution console warning. | Either subscribe or keep the attribution. | Any editor session. | — | polish |
| A-015 | low | editor | all | Export dialog Close plus inspector × are both “close”; easy to hit the wrong one. | Distinct labels (already improved once). | Export at 1440. | `docs/audit/media/export-dialog-1440.png` | polish |

Deferred, **not** filed as bugs: Mermaid/draw.io import, hosted sharing, live agent as a shipped claim.

## Per-kind journeys

### Architecture — Enspire CRM runtime

`docs/audit/diagrams/enspire-architecture.json` (14 nodes). Browser + Redux → App Router/`authedRoute` → domain services → Prisma → CRM Postgres; GitFame read-only; Google, Twilio, CoinStats, X scraper, LLM.

Human: Open file worked; outline count 14; Arrange/Export/Help/Commands present; Saved. Missing vendor edges (A-002). Dense ELK (A-006). Phone unusable with inspector open (A-004).

### Workflow — login and 2FA

`enspire-workflow.json`. Credentials vs Google, then 2FA send/verify, JWT. Layout is the most readable of the five. Decisions are still rounded cards, not diamonds (A-012). Enspire itself skips 2FA on Google OAuth — that is a **CRM** fact, not a Mapgrain bug.

### Sequence — authed board GET

`enspire-sequence.json` with `alt` `[session]` / `[unauthorized]`. Looks like a sequence diagram. Viewport bar covers the last replies (A-009). Kind labels truncate.

### Data flow — Alpha Terminal ingest

`enspire-data-flow.json`. X → fetch → spam filter → pool → drain ↔ LLM → feed → brief → owner. Nodes share architecture chrome (A-012). Layout splits into two bands.

### Lifecycle — Alpha tweet status

`enspire-lifecycle.json`. `pending` (initial) → `processing` → `analyzed`/`failed`; skip from pending. Guard text overlaps the pending node (A-006). Initial/final is an inspector field, not a strong canvas mark.

## Editor chrome (human)

- Start surface lists all five modes and `npx mapgrain@0.2.1` (`docs/audit/media/start-surface-1440.png`).
- Open file imports validating JSON. Recents appear after the first save.
- Help (`?`) and Commands (`⌘K`) work; Help is clipped (A-003).
- Export offers SVG, PNG, JPEG, WebP, Copy image, Story WebM, HTML, JSON.
- At 390: More `···`, Outline, Details, Focus. Fit all control gone (A-004).
- Present, Add component, Story WebM cancel, and kind-switch were **not** fully exercised this pass.

## CLI

All five kinds: `validate` 0. `view` en/uk HTML is offline (inline script + `data:font/woff2`). `compare` sees a one-label edit. `watch --once` keeps last-good. `doctor` green with a **false** labeled-PNG check (A-001).

`npx mapgrain@0.2.1 validate` on the sequence file passed. Sequence/data-flow/lifecycle were not sent to `0.1.0`.

## Skill live run

One Grok Build agent followed `SKILL.md` in `/tmp/mapgrain-skill-audit` against Enspire (read-only):

| Live-task row | Result |
| --- | --- |
| text → 8–12 node architecture | pass (11 nodes, no layout on create) |
| repository-grounded | pass |
| ID/position-preserving edit | pass |
| invalid-input repair | pass in 1 attempt |
| readable HTML export | pass (offline) |

**Not a ship claim.** `docs/agents.md` live-task rows stay untested for other agents. Skill docs lag five-mode kinds (A-011). After ELK, `diagnose` overlap with no skill-legal coordinate fix (A-006).

## Security

- No CRM secrets in diagrams, screenshots, or this file.
- Portable HTML: no remote scripts/fonts.
- Evidence git `verified` stayed false unless diagnose cwd was the CRM repo **and** path was repo-relative (A-005).
- Studio loopback was not the primary editor path this pass (Vite dev).

## Competitive kinds (gaps, not bugs)

| Enspire need | Mapgrain | Mermaid | draw.io | IcePanel / Lucid |
| --- | --- | --- | --- | --- |
| Runtime map | architecture | flowchart | yes | C4 closer |
| Login/2FA | workflow | flowchart | yes | swimlanes |
| HTTP + SSE | sequence | sequenceDiagram | yes | yes |
| Alpha ingest | data-flow | flowchart | DFD | yes |
| Tweet/2FA states | lifecycle | stateDiagram | yes | yes |
| Prisma ER | **gap** | erDiagram | yes | yes |
| C4 context/container | **gap** | — | — | IcePanel |
| Recharts bar/pie/line | **gap** | pie/xychart | yes | yes |
| Note Mermaid embed | **gap** (import deferred) | native | — | — |

## Recommended next slices (do not start in F054)

1. **F055** — Rasterize node labels into PNG/card; make doctor fail without them.
2. **F056** — Source/target handles from edge use, not west=target.
3. **F057** — Help/command overlays scroll; search placeholder not clipped.
4. **F058** — Phone: keep Fit all as a control; inspector should not trap the canvas.
5. **F059** — Diagnose `--root` / document-relative evidence paths.
6. **F060** — Readable default ELK labels on 10–16 node CRM-sized graphs.
7. **F061** — Card `--view` must select nodes or fail.
8. **F064** — Skill `schema.md` + invalid-kind diagnostics for five modes.

## What was not a failure

- Five-mode validate on a real app.
- Sequence alt/opt in 0.2.1.
- UK viewer chrome.
- Offline HTML.
- Start surface five-mode picker and versioned `npx mapgrain@0.2.1` copy.
- `--strict` ignoring `label_clearance` (documented).
- Not claiming live agent, Mermaid import, or hosted sharing.
