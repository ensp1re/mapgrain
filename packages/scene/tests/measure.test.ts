import assert from "node:assert/strict";
import test from "node:test";
import { cachedTextMeasurer, defaultFont, fontTextMeasurer, measureText } from "../src/index.ts";

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

test("cached measurer returns the same size without calling through twice", () => {
  let calls = 0;
  const inner = {
    measure(text: string, font: { size: number; lineHeight: number }) {
      calls += 1;
      return { width: text.length * font.size, height: font.lineHeight };
    },
  };
  const cached = cachedTextMeasurer(inner);
  const first = cached.measure("API", defaultFont);
  const second = cached.measure("API", defaultFont);
  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  cached.measure("Cache", defaultFont);
  assert.equal(calls, 2);
});
