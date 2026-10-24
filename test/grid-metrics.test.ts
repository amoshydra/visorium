import assert from "node:assert/strict";
import test from "node:test";
import { getGridMetrics } from "../src/client/lib/layout.js";

test("gives phones two columns by default", () => {
  assert.deepEqual(getGridMetrics(320, "comfortable", true), {
    columns: 2,
    columnWidth: 160,
  });
  assert.deepEqual(getGridMetrics(390, "comfortable", true), {
    columns: 2,
    columnWidth: 195,
  });
});

test("adapts mobile columns to landscape width", () => {
  assert.deepEqual(getGridMetrics(844, "comfortable", true), {
    columns: 5,
    columnWidth: 168,
  });
  assert.deepEqual(getGridMetrics(844, "compact", true), {
    columns: 6,
    columnWidth: 140,
  });
  assert.deepEqual(getGridMetrics(844, "large", true), {
    columns: 3,
    columnWidth: 281,
  });
});

test("keeps at least two columns for image and video modes", () => {
  assert.equal(getGridMetrics(320, "comfortable", true).columns, 2);
  assert.equal(getGridMetrics(320, "compact", true).columns, 3);
  assert.equal(getGridMetrics(320, "large", true).columns, 1);
});

test("keeps desktop column behaviour", () => {
  assert.deepEqual(getGridMetrics(1280, "comfortable", false), {
    columns: 6,
    columnWidth: 213,
  });
  assert.deepEqual(getGridMetrics(1024, "compact", false), {
    columns: 7,
    columnWidth: 146,
  });
});
