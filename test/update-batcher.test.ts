import assert from "node:assert/strict";
import test from "node:test";
import type { FileInfo } from "../src/shared/FileInfo.js";
import type { FileBatch } from "../src/shared/events.js";
import { createUpdateBatcher } from "../src/server/update-batcher.js";

const file = (t: number, mt = t): FileInfo => ({ t, mt });

test("coalesces updates and deletes into one batch", () => {
  const batches: FileBatch[] = [];
  const batcher = createUpdateBatcher({
    intervalMs: 1000,
    onFlush: (batch) => batches.push(batch),
  });

  batcher.set("a.jpg", file(1));
  batcher.set("b.jpg", file(2));
  batcher.set("a.jpg", file(3));
  batcher.delete("c.jpg");

  assert.equal(batcher.pending, 3);

  batcher.flush();

  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0], {
    set: [
      ["a.jpg", file(3)],
      ["b.jpg", file(2)],
    ],
    delete: ["c.jpg"],
  });
  assert.equal(batcher.pending, 0);
});

test("a later set wins over a pending delete", () => {
  const batches: FileBatch[] = [];
  const batcher = createUpdateBatcher({
    intervalMs: 1000,
    onFlush: (batch) => batches.push(batch),
  });

  batcher.delete("a.jpg");
  batcher.set("a.jpg", file(4));
  batcher.flush();

  assert.deepEqual(batches, [{ set: [["a.jpg", file(4)]], delete: [] }]);
});

test("a later delete wins over a pending set", () => {
  const batches: FileBatch[] = [];
  const batcher = createUpdateBatcher({
    intervalMs: 1000,
    onFlush: (batch) => batches.push(batch),
  });

  batcher.set("a.jpg", file(5));
  batcher.delete("a.jpg");
  batcher.flush();

  assert.deepEqual(batches, [{ set: [], delete: ["a.jpg"] }]);
});

test("flushes automatically after the interval", async () => {
  const batches: FileBatch[] = [];
  const batcher = createUpdateBatcher({
    intervalMs: 10,
    onFlush: (batch) => batches.push(batch),
  });

  batcher.set("a.jpg", file(1));
  await new Promise((resolve) => setTimeout(resolve, 40));

  assert.equal(batches.length, 1);
  assert.equal(batcher.pending, 0);
});

test("does not flush an empty batch", () => {
  const batches: FileBatch[] = [];
  const batcher = createUpdateBatcher({
    intervalMs: 1000,
    onFlush: (batch) => batches.push(batch),
  });

  batcher.flush();
  assert.deepEqual(batches, []);
});
