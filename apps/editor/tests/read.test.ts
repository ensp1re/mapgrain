import assert from "node:assert/strict";
import test from "node:test";
import { DOCUMENT_KIND, NODE_MARKER } from "@mapgrain/document";
import { EMPTY_VISIBILITY, isHiding, toggleHidden, visibleSet } from "../src/edit/visibility.ts";
import { TEMPLATES } from "../src/templates/catalog.ts";
import {
  availableTransitions,
  canRun,
  fireTransition,
  isRunFinished,
  runEntry,
  startRun,
} from "../src/walkthrough/run.ts";

const lifecycle = TEMPLATES.find((item) => item.document.kind === DOCUMENT_KIND.LIFECYCLE)!;
const workflow = TEMPLATES.find((item) => item.document.kind === DOCUMENT_KIND.WORKFLOW)!;
const architecture = TEMPLATES.find((item) => item.document.kind === DOCUMENT_KIND.ARCHITECTURE)!;

test("hiding a component hides its connections and nothing else", () => {
  const document = lifecycle.document;
  const victim = document.edges[0]!.source.nodeId;
  const before = visibleSet(document, EMPTY_VISIBILITY);
  const after = visibleSet(document, { ...EMPTY_VISIBILITY, hiddenNodeIds: [victim] });

  assert.equal(after.nodeIds.has(victim), false);
  assert.equal(after.hiddenNodes, 1);
  for (const id of before.nodeIds) {
    if (id !== victim) assert.equal(after.nodeIds.has(id), true, `${id} should stay`);
  }
  for (const edge of document.edges) {
    const touches = edge.source.nodeId === victim || edge.target.nodeId === victim;
    assert.equal(after.edgeIds.has(edge.id), touches ? false : before.edgeIds.has(edge.id));
  }
});

test("hiding a lane hides what it holds", () => {
  const laned = TEMPLATES.find((item) => item.document.groups.length > 0)!.document;
  const lane = laned.groups[0]!;
  const shown = visibleSet(laned, { ...EMPTY_VISIBILITY, hiddenNodeIds: [lane.id] });
  assert.equal(shown.nodeIds.has(lane.id), false);
  for (const node of laned.nodes) {
    if (node.groupId === lane.id) assert.equal(shown.nodeIds.has(node.id), false, node.id);
  }
});

test("hiding every connection keeps every component", () => {
  const document = workflow.document;
  const shown = visibleSet(document, { ...EMPTY_VISIBILITY, allEdgesHidden: true });
  assert.equal(shown.edgeIds.size, 0);
  assert.equal(shown.hiddenEdges, document.edges.length);
  assert.equal(shown.hiddenNodes, 0);
});

test("hiding is reversible and the empty state hides nothing", () => {
  const document = workflow.document;
  const id = document.nodes[0]!.id;
  const hidden = toggleHidden(EMPTY_VISIBILITY.hiddenNodeIds, id);
  assert.deepEqual(hidden, [id]);
  assert.deepEqual(toggleHidden(hidden, id), []);
  assert.equal(isHiding(EMPTY_VISIBILITY), false);
  assert.equal(isHiding({ ...EMPTY_VISIBILITY, hiddenNodeIds: [id] }), true);
  assert.deepEqual(
    [...visibleSet(document, EMPTY_VISIBILITY).nodeIds].sort(),
    [...document.nodes.map((node) => node.id), ...document.groups.map((group) => group.id)].sort(),
  );
});

test("only the kinds that answer 'what happens next' can run", () => {
  assert.equal(canRun(lifecycle.document), true);
  assert.equal(canRun(workflow.document), true);
  assert.equal(canRun(architecture.document), false);
});

test("a run starts at the initial state and its moves are the document's outgoing edges", () => {
  for (const item of TEMPLATES.filter((entry) => canRun(entry.document))) {
    const document = item.document;
    const entry = runEntry(document);
    assert.notEqual(entry, null, item.id);
    const initial = document.nodes.find((node) => node.marker === NODE_MARKER.INITIAL);
    if (initial) assert.equal(entry, initial.id, item.id);

    for (const node of document.nodes) {
      const outgoing = document.edges.filter((edge) => edge.source.nodeId === node.id);
      assert.deepEqual(
        availableTransitions(document, node.id).map((move) => move.edgeId),
        outgoing.map((edge) => edge.id),
        `${item.id}: ${node.id}`,
      );
      assert.equal(
        isRunFinished(document, node.id),
        node.marker === NODE_MARKER.FINAL || outgoing.length === 0,
        `${item.id}: ${node.id}`,
      );
    }
  }
});

test("firing a transition moves the run and never touches the document", () => {
  const document = workflow.document;
  const before = JSON.stringify(document);
  let state = startRun(document)!;
  const log: string[] = [];

  for (let step = 0; step < 3; step += 1) {
    const moves = availableTransitions(document, state.activeId);
    if (moves.length === 0) break;
    const move = moves[0]!;
    const next = fireTransition(document, state, move.edgeId);
    assert.equal(next.activeId, move.targetId);
    assert.equal(next.log.length, state.log.length + 1);
    assert.deepEqual(next.log.at(-1), {
      edgeId: move.edgeId,
      fromId: state.activeId,
      toId: move.targetId,
      label: move.label,
    });
    log.push(move.edgeId);
    state = next;
  }

  assert.equal(log.length, 3);
  assert.equal(JSON.stringify(document), before, "the document must be byte-identical");
});

test("firing an edge that does not leave the active state is ignored", () => {
  const document = lifecycle.document;
  const state = startRun(document)!;
  const foreign = document.edges.find((edge) => edge.source.nodeId !== state.activeId)!;
  assert.equal(fireTransition(document, state, foreign.id), state);
  assert.equal(fireTransition(document, state, "no-such-edge"), state);
});
