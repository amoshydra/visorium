import assert from "node:assert/strict";
import test from "node:test";
import { getGridMetrics, MOBILE_COLUMNS } from "../src/client/lib/layout.js";

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

test("lets mobile density choose 1 or 3 columns", () => {
  assert.equal(getGridMetrics(320, "compact", true).columns, 3);
  assert.equal(getGridMetrics(320, "large", true).columns, 1);
  assert.equal(getGridMetrics(320, "large", true).columnWidth, 320);
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

test("maps mobile density to column counts", () => {
  assert.deepEqual(MOBILE_COLUMNS, {
    compact: 3,
    comfortable: 2,
    large: 1,
  });
});
