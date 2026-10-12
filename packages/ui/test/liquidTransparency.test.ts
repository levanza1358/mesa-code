import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LIQUID_TRANSPARENCY,
  MAX_LIQUID_TRANSPARENCY,
  MIN_LIQUID_TRANSPARENCY,
  normalizeLiquidTransparency,
} from "../src/lib/liquidTransparency.js";

test("normalizeLiquidTransparency clamps to [0, 100] and defaults unknown input", () => {
  assert.equal(normalizeLiquidTransparency(55), 55);
  assert.equal(normalizeLiquidTransparency(MIN_LIQUID_TRANSPARENCY), 0);
  assert.equal(normalizeLiquidTransparency(MAX_LIQUID_TRANSPARENCY), 100);
  assert.equal(normalizeLiquidTransparency(140), MAX_LIQUID_TRANSPARENCY);
  assert.equal(normalizeLiquidTransparency(-20), MIN_LIQUID_TRANSPARENCY);
  assert.equal(normalizeLiquidTransparency(33.6), 34);
  assert.equal(normalizeLiquidTransparency(Number.NaN), DEFAULT_LIQUID_TRANSPARENCY);
  assert.equal(normalizeLiquidTransparency(undefined), DEFAULT_LIQUID_TRANSPARENCY);
  assert.equal(normalizeLiquidTransparency("50"), DEFAULT_LIQUID_TRANSPARENCY);
});
