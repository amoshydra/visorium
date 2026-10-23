import assert from "node:assert/strict";
import test from "node:test";
import { applyFileBatch } from "../src/client/lib/file-index.js";

test("applies updates and deletes", () => {
  const record = {
    "a.jpg": { t: 1, mt: 1 },
    "b.jpg": { t: 2, mt: 2 },
  };

  const next = applyFileBatch(record, {
    set: [["b.jpg", { t: 3, mt: 4 }] as const],
    delete: ["a.jpg"],
  });

  assert.deepEqual(next, { "b.jpg": { t: 3, mt: 4 } });
  assert.deepEqual(record, {
    "a.jpg": { t: 1, mt: 1 },
    "b.jpg": { t: 2, mt: 2 },
  });
});

test("adds new entries without mutating the input", () => {
  const record = {};
  const next = applyFileBatch(record, {
    set: [["c.jpg", { t: 5, mt: 5 }] as const],
    delete: [],
  });

  assert.deepEqual(next, { "c.jpg": { t: 5, mt: 5 } });
  assert.deepEqual(record, {});
});
