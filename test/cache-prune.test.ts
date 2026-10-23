import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  parseCacheMaxBytes,
  pruneCache,
} from "../src/server/cache-prune.js";

const makeTempDir = (t: { after: (fn: () => Promise<void>) => void }) => {
  return mkdtemp(join(tmpdir(), "visorium-prune-")).then((dir) => {
    t.after(() => rm(dir, { recursive: true, force: true }));
    return dir;
  });
};

const createFile = async (
  path: string,
  bytes: number,
  seconds: number,
) => {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, Buffer.alloc(bytes, 1));
  const time = new Date(seconds * 1000);
  await utimes(path, time, time);
};

test("parses cache limits", () => {
  assert.equal(parseCacheMaxBytes(undefined, 100), 100);
  assert.equal(parseCacheMaxBytes("1000", 100), 1000);
  assert.equal(parseCacheMaxBytes("nope", 100), 100);
  assert.equal(parseCacheMaxBytes("-1", 100), 100);
});

test("does nothing when the cache is under the limit", async (t) => {
  const cacheDir = await makeTempDir(t);
  await createFile(join(cacheDir, "thumbs", "a.webp"), 100, 1);

  const result = await pruneCache(cacheDir, { maxBytes: 1000 });
  assert.equal(result.removedFiles, 0);
  assert.equal(result.bytesAfter, 100);
});

test("removes oldest files until it reaches the target", async (t) => {
  const cacheDir = await makeTempDir(t);
  await createFile(join(cacheDir, "thumbs", "a.webp"), 100, 1);
  await createFile(join(cacheDir, "thumbs", "b.webp"), 100, 2);
  await createFile(join(cacheDir, "posters", "c.jpg"), 100, 3);
  await createFile(join(cacheDir, "index", "metadata.json"), 100, 0);

  const result = await pruneCache(cacheDir, {
    maxBytes: 250,
    targetRatio: 0.8,
  });

  assert.equal(result.bytesBefore, 300);
  assert.equal(result.removedFiles, 1);
  assert.equal(result.bytesAfter, 200);
  await assert.rejects(stat(join(cacheDir, "thumbs", "a.webp")));
  await stat(join(cacheDir, "thumbs", "b.webp"));
  await stat(join(cacheDir, "posters", "c.jpg"));
  await stat(join(cacheDir, "index", "metadata.json"));
});

test("handles a missing cache directory", async (t) => {
  const cacheDir = await makeTempDir(t);
  const result = await pruneCache(cacheDir, { maxBytes: 1 });
  assert.deepEqual(result, {
    scannedFiles: 0,
    removedFiles: 0,
    bytesBefore: 0,
    bytesAfter: 0,
  });
});
