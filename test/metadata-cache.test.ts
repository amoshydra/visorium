import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  getMetadataCachePath,
  loadMetadataCache,
} from "../src/server/metadata-cache.js";

const makeTempDir = (t: { after: (fn: () => Promise<void>) => void }) => {
  return mkdtemp(join(tmpdir(), "visorium-metadata-")).then((dir) => {
    t.after(() => rm(dir, { recursive: true, force: true }));
    return dir;
  });
};

test("stores entries and reloads matching metadata", async (t) => {
  const cacheDir = await makeTempDir(t);
  const key = "/media/photos";
  const cache = await loadMetadataCache({ cacheDir, key, saveDebounceMs: 1000 });

  cache.set("a.jpg", 100, 200, "4/3");
  assert.equal(cache.get("a.jpg", 100, 200), "4/3");
  assert.equal(cache.get("a.jpg", 101, 200), undefined);
  assert.equal(cache.get("a.jpg", 100, 201), undefined);
  assert.equal(cache.get("missing.jpg", 100, 200), undefined);

  await cache.close();

  const reloaded = await loadMetadataCache({ cacheDir, key });
  assert.equal(reloaded.get("a.jpg", 100, 200), "4/3");
  await reloaded.close();
});

test("deletes entries", async (t) => {
  const cacheDir = await makeTempDir(t);
  const key = "/media/photos";
  const cache = await loadMetadataCache({ cacheDir, key, saveDebounceMs: 1000 });

  cache.set("a.jpg", 100, 200, "4/3");
  cache.delete("a.jpg");
  await cache.flush();

  const reloaded = await loadMetadataCache({ cacheDir, key });
  assert.equal(reloaded.get("a.jpg", 100, 200), undefined);
  await reloaded.close();
});

test("ignores an invalid cache file", async (t) => {
  const cacheDir = await makeTempDir(t);
  const key = "/media/photos";
  const path = getMetadataCachePath(cacheDir, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, "not json");

  const cache = await loadMetadataCache({ cacheDir, key });
  assert.equal(cache.get("a.jpg", 100, 200), undefined);
  await cache.close();
});

test("autosaves after the debounce interval", async (t) => {
  const cacheDir = await makeTempDir(t);
  const key = "/media/photos";
  const cache = await loadMetadataCache({
    cacheDir,
    key,
    saveDebounceMs: 10,
  });

  cache.set("a.jpg", 100, 200, "16/9");
  await new Promise((resolve) => setTimeout(resolve, 40));

  const raw = JSON.parse(await readFile(cache.path, "utf8"));
  assert.equal(raw.version, 1);
  assert.deepEqual(raw.files["a.jpg"], { mt: 100, sz: 200, ar: "16/9" });
  await cache.close();
});
