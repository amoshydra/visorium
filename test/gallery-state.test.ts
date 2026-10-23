import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GALLERY_STATE,
  parseGalleryState,
  serializeGalleryState,
} from "../src/client/lib/gallery-state.js";

test("parses the default state", () => {
  assert.deepEqual(parseGalleryState(""), DEFAULT_GALLERY_STATE);
});

test("parses all supported parameters", () => {
  assert.deepEqual(
    parseGalleryState(
      "?q=cat&type=video&sort=modified&order=desc&folder=%2Fsub%2F&density=compact",
    ),
    {
      query: "cat",
      type: "video",
      sort: "modified",
      order: "desc",
      folder: "sub",
      density: "compact",
    },
  );
});

test("supports the legacy search parameter", () => {
  assert.equal(parseGalleryState("?search=dog").query, "dog");
  assert.equal(parseGalleryState("?q=cat&search=dog").query, "cat");
});

test("falls back on invalid choices", () => {
  const state = parseGalleryState(
    "?type=gif&sort=random&order=sideways&density=huge",
  );
  assert.equal(state.type, "all");
  assert.equal(state.sort, "discovery");
  assert.equal(state.order, "asc");
  assert.equal(state.density, "comfortable");
});

test("serializes only non-default values", () => {
  assert.equal(serializeGalleryState(DEFAULT_GALLERY_STATE), "");
  assert.equal(
    serializeGalleryState({
      query: "cat dog",
      type: "image",
      sort: "name",
      order: "desc",
      folder: "sub/deep",
      density: "large",
    }),
    "q=cat+dog&type=image&sort=name&order=desc&folder=sub%2Fdeep&density=large",
  );
});

test("round-trips state through the URL", () => {
  const state = {
    query: "sunset #1",
    type: "image" as const,
    sort: "size" as const,
    order: "desc" as const,
    folder: "2024/trip",
    density: "compact" as const,
  };

  assert.deepEqual(parseGalleryState(serializeGalleryState(state)), state);
});
