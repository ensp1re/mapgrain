import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DOCUMENT_KIND } from "@mapgrain/document";
import { applyWorkflowLanes, buildScene, LANE_ROLE } from "../src/index.ts";

const fixtures = fileURLToPath(new URL("../../../tests/fixtures/documents", import.meta.url));

async function load(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`${fixtures}/${name}`, "utf8")) as unknown;
}

test("workflow groups become equal-width lanes", async () => {
  const result = buildScene(await load("workflow-decision.json"));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const lanes = result.scene.groups.filter((group) => group.role === LANE_ROLE);
  assert.equal(lanes.length, 2);
  assert.ok(lanes.every((lane) => lane.parentId === null));
  assert.equal(new Set(lanes.map((lane) => lane.rect.width)).size, 1);
  assert.equal(new Set(lanes.map((lane) => lane.rect.x)).size, 1);
  const author = result.scene.nodes.find((node) => node.id === "author");
  const route = result.scene.nodes.find((node) => node.id === "route");
  assert.ok(author && route);
  assert.ok(author.rect.y + 40 < route.rect.y);
});

test("architecture groups are not lanes", async () => {
  const result = buildScene(await load("nested-groups.json"));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.scene.groups.length > 0);
  assert.ok(result.scene.groups.every((group) => group.role !== LANE_ROLE));
});

test("applyWorkflowLanes leaves non-workflow groups untouched", () => {
  const groups = [
    {
      id: "runtime",
      label: { lines: [{ text: "Runtime", width: 40, height: 12 }], width: 40, height: 12 },
      parentId: null,
      rect: { x: 0, y: 0, width: 100, height: 40 },
    },
  ];
  assert.equal(applyWorkflowLanes(DOCUMENT_KIND.ARCHITECTURE, groups), groups);
});
