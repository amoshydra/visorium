import assert from "node:assert/strict";
import test from "node:test";
import {
  createScanFilter,
  isHiddenPath,
  matchesIgnorePatterns,
} from "../src/cli/utils/scan-filter.js";

test("detects hidden files and folders", () => {
  assert.equal(isHiddenPath(".thumbnails"), true);
  assert.equal(isHiddenPath("sub/.stickers/photo.jpg"), true);
  assert.equal(isHiddenPath(".hidden.jpg"), true);
  assert.equal(isHiddenPath("photo.jpg"), false);
  assert.equal(isHiddenPath("sub/photo.jpg"), false);
  assert.equal(isHiddenPath("."), false);
});

test("skips hidden paths by default", () => {
  const filter = createScanFilter({ includeHidden: false, ignore: [] });

  assert.equal(filter(".thumbnails/photo.jpg"), true);
  assert.equal(filter(".hidden.jpg"), true);
  assert.equal(filter("sub/.aux/photo.jpg"), true);
  assert.equal(filter("photo.jpg"), false);
  assert.equal(filter("sub/photo.jpg"), false);
});

test("includes hidden paths when requested", () => {
  const filter = createScanFilter({ includeHidden: true, ignore: [] });

  assert.equal(filter(".thumbnails/photo.jpg"), false);
  assert.equal(filter(".hidden.jpg"), false);
});

test("always skips node_modules", () => {
  const filter = createScanFilter({ includeHidden: true, ignore: [] });

  assert.equal(filter("node_modules/photo.jpg"), true);
  assert.equal(filter("sub/node_modules/photo.jpg"), true);
  assert.equal(filter("node_modules.jpg"), false);
});

test("matches ignore patterns at any depth", () => {
  assert.equal(matchesIgnorePatterns("sub/.thumbnails/a.jpg", [".thumbnails"]), true);
  assert.equal(
    matchesIgnorePatterns("sub/.stickers/a.jpg", ["**/.stickers/**"]),
    true,
  );
  assert.equal(
    matchesIgnorePatterns(".stickers", ["**/.stickers/**"]),
    true,
  );
  assert.equal(matchesIgnorePatterns("sub/a.tmp", ["*.tmp"]), true);
  assert.equal(matchesIgnorePatterns("sub/a.jpg", ["*.tmp"]), false);
  assert.equal(matchesIgnorePatterns("sub/a.jpg", ["sub/**"]), true);
  assert.equal(matchesIgnorePatterns("sub", ["sub/**"]), true);
  assert.equal(matchesIgnorePatterns("sub/a.jpg", ["other/**"]), false);
});

test("ignore patterns survive hidden inclusion", () => {
  const filter = createScanFilter({
    includeHidden: true,
    ignore: [".thumbnails", "**/.stickers/**"],
  });

  assert.equal(filter(".thumbnails/a.jpg"), true);
  assert.equal(filter("sub/.stickers/a.jpg"), true);
  assert.equal(filter(".hidden.jpg"), false);
});

test("normalizes Windows separators", () => {
  const filter = createScanFilter({ includeHidden: false, ignore: [] });

  assert.equal(filter("sub\\photo.jpg"), false);
  assert.equal(filter("sub\\.hidden\\photo.jpg"), true);
  assert.equal(isHiddenPath("sub\\.hidden\\photo.jpg"), true);
});
