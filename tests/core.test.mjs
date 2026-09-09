import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { features, infer, correct } from "../src/core.js";
const model = JSON.parse(
  readFileSync(new URL("../src/model.json", import.meta.url)),
);
test("Identity preserves all pixels including alpha", () => {
  const p = new Uint8ClampedArray([0, 12, 255, 0, 200, 100, 20, 128]);
  const copy = p.slice();
  correct(p, { brightness: 0, contrast: 1, saturation: 1 });
  assert.deepEqual(p, copy);
});
test("Dark and bright inputs receive opposite exposure adjustments", () => {
  assert.ok(infer([0.1, 0.15, 0.2], model).brightness > 0);
  assert.ok(infer([0.85, 0.15, 0.2], model).brightness < 0);
});
test("Transparency is excluded from image statistics", () =>
  assert.deepEqual(
    features(new Uint8ClampedArray([255, 0, 0, 0])),
    [0.5, 0.2, 0],
  ));
test("Model predictions remain bounded across feature domain", () => {
  for (let a = 0; a <= 1; a += 0.1)
    for (let b = 0; b < 0.5; b += 0.05) {
      const p = infer([a, b, 0.3], model);
      assert.ok(p.brightness >= -0.22 && p.brightness <= 0.22);
      assert.ok(p.contrast >= 0.85 && p.contrast <= 1.5);
      assert.ok(p.saturation >= 0.8 && p.saturation <= 1.4);
    }
});
test("Correction improves a deliberately underexposed neutral reference", () => {
  const p = new Uint8ClampedArray(256 * 4),
    reference = new Uint8ClampedArray(p.length);
  for (let i = 0; i < 256; i++) {
    for (let c = 0; c < 3; c++) {
      reference[i * 4 + c] = 60 + i * 0.5;
      p[i * 4 + c] = reference[i * 4 + c] - 45;
    }
    p[i * 4 + 3] = reference[i * 4 + 3] = 255;
  }
  const mse = () =>
    p.reduce((s, v, i) => s + (v - reference[i]) ** 2, 0) / p.length;
  const before = mse();
  correct(p, infer(features(p), model));
  assert.ok(mse() < before);
});
