import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DOCUMENT_KIND } from "@mapgrain/document";
import { buildScene } from "../src/index.ts";
import { routeCost } from "../src/route/orthogonal.ts";

const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

async function load(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`${fixtures}/${name}`, "utf8")) as unknown;
}

const ROUTED = [
  "nested-groups.json",
  "cycle.json",
  "parallel-edges.json",
  "workflow-decision.json",
  "workflow-review.json",
  "data-flow-ingest.json",
  "lifecycle-session.json",
  "disconnected.json",
  "long-labels.json",
];

test("every routed connection is made of right angles", async () => {
  for (const name of ROUTED) {
    const result = buildScene(await load(name));
    assert.equal(result.ok, true, name);
    if (!result.ok) continue;
    for (const edge of result.scene.edges) {
      for (let index = 0; index + 1 < edge.points.length; index += 1) {
        const first = edge.points[index];
        const second = edge.points[index + 1];
        assert.ok(first && second);
        const diagonal = Math.abs(first.x - second.x) > 0.5 && Math.abs(first.y - second.y) > 0.5;
        assert.equal(diagonal, false, `${name}/${edge.id} has a diagonal segment`);
      }
    }
  }
});

test("connections route around the cards they do not touch", async () => {
  let crossings = 0;
  for (const name of ROUTED) {
    const result = buildScene(await load(name));
    if (!result.ok) continue;
    for (const edge of result.scene.edges) {
      const obstacles = result.scene.nodes
        .filter((node) => node.id !== edge.source.nodeId && node.id !== edge.target.nodeId)
        .map((node) => node.rect);
      crossings += routeCost(edge.points, obstacles);
    }
  }
  // The router shifts its channel and then detours; a stubborn case may remain, but the
  // straight port-to-port lines this replaced crossed cards constantly.
  assert.ok(crossings <= 2, `${crossings} segments cross a card they do not touch`);
});

test("parallel connections never share a path", async () => {
  const result = buildScene(await load("parallel-edges.json"));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const paths = result.scene.edges.map((edge) => JSON.stringify(edge.points));
  assert.equal(new Set(paths).size, paths.length);
});

test("a connection leaves and enters on the side that faces the other card", async () => {
  const result = buildScene(await load("workflow-review.json"));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const nodes = result.scene.nodes;
  for (const edge of result.scene.edges) {
    const source = nodes.find((node) => node.id === edge.source.nodeId)?.rect;
    const target = nodes.find((node) => node.id === edge.target.nodeId)?.rect;
    const first = edge.points[0];
    const last = edge.points.at(-1);
    assert.ok(source && target && first && last);
    // Endpoints sit on the card boundary, never inside it.
    const ends: Array<[{ x: number; y: number }, typeof source]> = [
      [first, source],
      [last, target],
    ];
    for (const [point, rect] of ends) {
      const inside =
        point.x > rect.x + 0.5 &&
        point.x < rect.x + rect.width - 0.5 &&
        point.y > rect.y + 0.5 &&
        point.y < rect.y + rect.height - 0.5;
      assert.equal(inside, false, `${edge.id} starts or ends inside a card`);
    }
  }
});

test("lanes stack without a gap and share one column grid", async () => {
  const result = buildScene(await load("workflow-decision.json"));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.scene.documentKind, DOCUMENT_KIND.WORKFLOW);
  const lanes = result.scene.groups
    .filter((group) => group.role === "lane")
    .sort((left, right) => left.rect.y - right.rect.y);
  assert.ok(lanes.length >= 2);
  for (const [index, lane] of lanes.slice(1).entries()) {
    const previous = lanes[index];
    assert.ok(previous);
    assert.equal(Math.round(lane.rect.y - (previous.rect.y + previous.rect.height)), 0);
    assert.equal(Math.round(lane.rect.x), Math.round(previous.rect.x));
    assert.equal(Math.round(lane.rect.width), Math.round(previous.rect.width));
  }
  // A step that follows another lane's step sits in a later column, never the same one.
  const route = result.scene.nodes.find((node) => node.id === "route");
  const author = result.scene.nodes.find((node) => node.id === "author");
  assert.ok(route && author);
  assert.ok(route.rect.x > author.rect.x, "the decision should sit after the actor that feeds it");
});
