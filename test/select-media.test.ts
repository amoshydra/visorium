import assert from "node:assert/strict";
import test from "node:test";
import type { MediaInfo } from "../src/client/hooks/useFileServerSocket.types.js";
import { ROOT_FOLDER, type GalleryState } from "../src/client/lib/gallery-state.js";
import {
  getFolderOptions,
  hasActiveFilters,
  matchesFolder,
  selectMedia,
} from "../src/client/lib/select-media.js";

const media = (
  name: string,
  overrides: Partial<MediaInfo> = {},
): MediaInfo => ({
  src: `http://localhost/files/${encodeURIComponent(name)}`,
  thumbSrc: `http://localhost/thumb?path=${encodeURIComponent(name)}`,
  name,
  aspectRatio: undefined,
  discovery: 0,
  mtime: 0,
  size: 0,
  ...overrides,
});

const files = [
  media("b.jpg", { discovery: 2, mtime: 20, size: 200 }),
  media("a.mp4", { discovery: 1, mtime: 10, size: 1000 }),
  media("sub/c.jpg", { discovery: 3, mtime: 30, size: 300 }),
  media("sub/deep/d.png", { discovery: 4, mtime: 5, size: 50 }),
  media("root.txt", { discovery: 5 }),
];

const state = (overrides: Partial<GalleryState> = {}): GalleryState => ({
  query: "",
  type: "all",
  sort: "discovery",
  order: "asc",
  folder: "",
  density: "comfortable",
  ...overrides,
});

test("filters by case-insensitive substring", () => {
  assert.deepEqual(
    selectMedia(files, state({ query: "SUB" })).map((file) => file.name),
    ["sub/c.jpg", "sub/deep/d.png"],
  );
});

test("filters by media type", () => {
  assert.deepEqual(
    selectMedia(files, state({ type: "video" })).map((file) => file.name),
    ["a.mp4"],
  );
  assert.deepEqual(
    selectMedia(files, state({ type: "image" })).map((file) => file.name),
    ["b.jpg", "sub/c.jpg", "sub/deep/d.png"],
  );
});

test("filters by folder", () => {
  assert.deepEqual(
    selectMedia(files, state({ folder: ROOT_FOLDER })).map((file) => file.name),
    ["a.mp4", "b.jpg", "root.txt"],
  );
  assert.deepEqual(
    selectMedia(files, state({ folder: "sub" })).map((file) => file.name),
    ["sub/c.jpg", "sub/deep/d.png"],
  );
  assert.deepEqual(
    selectMedia(files, state({ folder: "sub/deep" })).map((file) => file.name),
    ["sub/deep/d.png"],
  );
});

test("sorts by name, modified, size, and discovery", () => {
  assert.deepEqual(
    selectMedia(files, state({ sort: "name" })).map((file) => file.name),
    ["a.mp4", "b.jpg", "root.txt", "sub/c.jpg", "sub/deep/d.png"],
  );
  assert.deepEqual(
    selectMedia(files, state({ sort: "modified", order: "desc" })).map(
      (file) => file.name,
    ),
    ["sub/c.jpg", "b.jpg", "a.mp4", "sub/deep/d.png", "root.txt"],
  );
  assert.deepEqual(
    selectMedia(files, state({ sort: "size" })).map((file) => file.name),
    ["root.txt", "sub/deep/d.png", "b.jpg", "sub/c.jpg", "a.mp4"],
  );
  assert.deepEqual(
    selectMedia(files, state({ order: "desc" })).map((file) => file.name),
    ["root.txt", "sub/deep/d.png", "sub/c.jpg", "b.jpg", "a.mp4"],
  );
});

test("builds folder options with recursive counts", () => {
  assert.deepEqual(getFolderOptions(files), [
    { value: ROOT_FOLDER, label: "(root)", count: 3 },
    { value: "sub", label: "sub", count: 2 },
    { value: "sub/deep", label: "sub/deep", count: 1 },
  ]);
});

test("normalizes Windows-style separators", () => {
  assert.equal(matchesFolder("sub\\deep\\a.jpg", "sub"), true);
  assert.deepEqual(
    getFolderOptions([media("sub\\deep\\a.jpg")]).map((folder) => folder.value),
    ["sub", "sub/deep"],
  );
});

test("detects active filters", () => {
  assert.equal(hasActiveFilters(state()), false);
  assert.equal(hasActiveFilters(state({ query: " " })), false);
  assert.equal(hasActiveFilters(state({ query: "a" })), true);
  assert.equal(hasActiveFilters(state({ type: "image" })), true);
  assert.equal(hasActiveFilters(state({ folder: "sub" })), true);
});
