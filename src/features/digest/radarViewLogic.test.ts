import test from "node:test";
import assert from "node:assert/strict";
import {
  formatHeatDate,
  formatRadarDate,
  parsePercent,
  sourceGradient,
} from "./radarViewLogic";

test("formatRadarDate returns yyyy-mm-dd for valid iso strings", () => {
  assert.equal(formatRadarDate("2026-05-06T12:00:00Z"), "2026-05-06");
});

test("formatRadarDate returns null for null or invalid inputs", () => {
  assert.equal(formatRadarDate(null), null);
  assert.equal(formatRadarDate("not-a-date"), null);
});

test("sourceGradient maps known source colors and falls back", () => {
  assert.equal(sourceGradient("wechat"), "linear-gradient(90deg, #15803D, #22C55E)");
  assert.equal(sourceGradient("chrome"), "linear-gradient(90deg, #1D4ED8, #3B82F6)");
  assert.equal(sourceGradient("xiaoyun"), "linear-gradient(90deg, #EA580C, #F97316)");
  assert.equal(sourceGradient("unknown"), "linear-gradient(90deg, #78716C, #A8A29E)");
});

test("formatHeatDate converts yyyy-mm-dd into m/d and leaves unknown format untouched", () => {
  assert.equal(formatHeatDate("2026-03-21"), "3/21");
  assert.equal(formatHeatDate("bad-format"), "bad-format");
});

test("parsePercent extracts numeric percentage and falls back to 50", () => {
  assert.equal(parsePercent("85%"), 85);
  assert.equal(parsePercent("Depth 42"), 42);
  assert.equal(parsePercent("no digits"), 50);
});
