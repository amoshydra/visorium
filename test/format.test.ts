import assert from "node:assert/strict";
import test from "node:test";
import {
  formatBytes,
  formatCount,
  formatDate,
  formatDimensions,
} from "../src/client/lib/format.js";

test("formats byte sizes", () => {
  assert.equal(formatBytes(undefined), "—");
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1024 * 1024), "1.0 MB");
  assert.equal(formatBytes(5 * 1024 * 1024 * 1024), "5.0 GB");
});

test("formats dates", () => {
  assert.equal(formatDate(undefined), "—");
  assert.equal(formatDate(Number.NaN), "—");
  assert.notEqual(formatDate(0), "—");
});

test("formats dimensions", () => {
  assert.equal(formatDimensions(1920, 1080), "1920 × 1080");
  assert.equal(formatDimensions(undefined, 1080), "—");
});

test("formats counts using the current locale", () => {
  assert.equal(formatCount(1234), (1234).toLocaleString());
});
