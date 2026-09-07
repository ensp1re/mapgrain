import assert from "node:assert/strict";
import test from "node:test";
import { defaultFont, fontTextMeasurer, measureText } from "../src/index.ts";

test("font-backed measurer makes W wider than i and CJK wider than latin", () => {
  const wide = fontTextMeasurer.measure("WWW", defaultFont).width;
  const narrow = fontTextMeasurer.measure("iii", defaultFont).width;
  assert.ok(wide > narrow);
  const cjk = fontTextMeasurer.measure("宽度测试", defaultFont).width;
  const latin = fontTextMeasurer.measure("abcdef", defaultFont).width;
  assert.ok(cjk > latin);
  const cyrillic = fontTextMeasurer.measure("Привет", defaultFont).width;
  assert.ok(cyrillic > 0);
  const wrapped = measureText("very-long-identifier-token", defaultFont, 80, fontTextMeasurer);
  assert.ok(wrapped.lines.length > 1);
});
