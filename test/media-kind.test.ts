import assert from "node:assert/strict";
import test from "node:test";
import { getMediaKind } from "../src/client/lib/media-kind.js";

test("classifies images and videos", () => {
  assert.equal(getMediaKind("photo.jpg"), "image");
  assert.equal(getMediaKind("clip.mp4"), "video");
});

test("classifies 3D models and splats", () => {
  assert.equal(getMediaKind("scene.glb"), "model");
  assert.equal(getMediaKind("scene.gltf"), "model");
  assert.equal(getMediaKind("room.splat"), "splat");
  assert.equal(getMediaKind("room.ksplat"), "splat");
  assert.equal(getMediaKind("room.spz"), "splat");
  assert.equal(getMediaKind("room.ply"), "splat");
});

test("leaves unrelated files unclassified", () => {
  assert.equal(getMediaKind("notes.txt"), "error");
});
