import assert from "node:assert/strict";
import test from "node:test";
import { PRESET } from "@mapgrain/document";
import {
  iconMarkup,
  kindDisplayText,
  kindFontFor,
  measureText,
  presentationFromOptions,
  defaultSceneOptions,
  presetOverrides,
} from "../src/index.ts";

test("kind display uses uppercase tracking that compact and presentation both follow", () => {
  assert.equal(kindDisplayText("gateway"), "GATEWAY");
  const compact = kindFontFor(presetOverrides(PRESET.COMPACT).font!);
  const presentation = kindFontFor(presetOverrides(PRESET.PRESENTATION).font!);
  assert.equal(compact.size, 10);
  assert.equal(presentation.size, 12);
  assert.equal(compact.letterSpacingEm, presentation.letterSpacingEm);
  const options = defaultSceneOptions(presetOverrides(PRESET.COMFORTABLE));
  const vars = presentationFromOptions(options);
  assert.equal(vars.kindSize, 11);
  assert.equal(vars.titleSize, 14);
  const measured = measureText("GATEWAY", kindFontFor(options.font), 240, options.measurer);
  assert.ok(measured.width > measureText("GATEWAY", { ...kindFontFor(options.font), letterSpacingEm: 0 }, 240, options.measurer).width);
  assert.match(iconMarkup("gateway"), /viewBox="0 0 24 24"/);
  assert.match(iconMarkup("datastore"), /<ellipse /);
});
