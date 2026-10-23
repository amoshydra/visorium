import assert from "node:assert/strict";
import { toFileUrl, toThumbnailUrl } from "../src/client/lib/urls.js";
import test from "node:test";

test("builds encoded file URLs", () => {
  assert.equal(
    toFileUrl("http://localhost:3000", "a b.jpg", 123),
    "http://localhost:3000/files/a%20b.jpg?t=123",
  );
  assert.equal(
    toFileUrl("http://localhost:3000", "sub/a #1.jpg", undefined),
    "http://localhost:3000/files/sub%2Fa%20%231.jpg?t=0",
  );
});

test("builds encoded thumbnail URLs", () => {
  assert.equal(
    toThumbnailUrl("http://localhost:3000", "sub/a.jpg", 123, 640),
    "http://localhost:3000/thumb?path=sub%2Fa.jpg&v=123&w=640",
  );
  assert.equal(
    toThumbnailUrl("http://localhost:3000", "a b.jpg", 0),
    "http://localhost:3000/thumb?path=a%20b.jpg&v=0&w=640",
  );
});
