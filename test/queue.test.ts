import assert from "node:assert/strict";
import test from "node:test";
import { createQueue } from "../src/server/queue.js";

test("runs no more than the configured number of tasks at once", async () => {
  const queue = createQueue(2);
  let active = 0;
  let maxActive = 0;

  const task = async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active -= 1;
  };

  await Promise.all(Array.from({ length: 6 }, () => queue(task)));

  assert.equal(maxActive, 2);
  assert.equal(queue.active, 0);
  assert.equal(queue.pending, 0);
});

test("rejects an invalid concurrency", () => {
  assert.throws(() => createQueue(0), RangeError);
  assert.throws(() => createQueue(1.5), RangeError);
});
