import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createThumbnailer,
  getThumbnailCachePath,
  normalizeThumbnailWidth,
} from "../src/server/thumbnails.js";

const sharpModule = await import("sharp").catch(() => null);
const sharp = sharpModule?.default;

test("normalizes widths to supported sizes", () => {
  assert.equal(normalizeThumbnailWidth(undefined), 640);
  assert.equal(normalizeThumbnailWidth("480"), 480);
  assert.equal(normalizeThumbnailWidth(10), 160);
  assert.equal(normalizeThumbnailWidth(700), 640);
  assert.equal(normalizeThumbnailWidth(1500), 1600);
  assert.equal(normalizeThumbnailWidth(9999), 2048);
});

test("builds stable, source-specific cache paths", () => {
  const first = getThumbnailCachePath("/cache", "/media/a.jpg", 100, 10, 640);
  const second = getThumbnailCachePath("/cache", "/media/a.jpg", 100, 10, 640);
  const changed = getThumbnailCachePath("/cache", "/media/a.jpg", 101, 10, 640);

  assert.equal(first, second);
  assert.notEqual(first, changed);
  assert.match(first, /\.webp$/);
});

test("generates and reuses a thumbnail", { skip: !sharp }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "visorium-thumb-"));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const source = join(dir, "source.png");
  const cacheDir = join(dir, "cache");

  await sharp!({
    create: { width: 320, height: 200, channels: 3, background: "#ff0000" },
  })
    .png()
    .toFile(source);

  const thumbnailer = createThumbnailer({ cacheDir, concurrency: 2 });
  const result = await thumbnailer.get({
    sourcePath: source,
    mtimeMs: 1000,
    size: 123,
    width: 160,
  });

  assert.ok(result);
  assert.equal(result.width, 160);
  assert.ok((result.height ?? 0) > 0);

  const before = await readFile(result.path);

  await sharp!({
    create: { width: 320, height: 200, channels: 3, background: "#0000ff" },
  })
    .png()
    .toFile(source);

  const reused = await thumbnailer.get({
    sourcePath: source,
    mtimeMs: 1000,
    size: 123,
    width: 160,
  });

  assert.equal(reused?.path, result.path);
  assert.deepEqual(await readFile(result.path), before);
});

test("returns null for an unreadable source", { skip: !sharp }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "visorium-thumb-bad-"));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const source = join(dir, "broken.jpg");
  await writeFile(source, "not an image");

  const thumbnailer = createThumbnailer({ cacheDir: join(dir, "cache") });
  const result = await thumbnailer.get({
    sourcePath: source,
    mtimeMs: 1000,
    size: 11,
    width: 640,
  });

  assert.equal(result, null);
});

test("returns null when sharp is unavailable", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "visorium-thumb-nosharp-"));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const source = join(dir, "source.png");
  await writeFile(source, "content");

  const thumbnailer = createThumbnailer({
    cacheDir: join(dir, "cache"),
    sharpLoader: async () => null,
  });
  const result = await thumbnailer.get({
    sourcePath: source,
    mtimeMs: 1000,
    size: 7,
    width: 640,
  });

  assert.equal(result, null);
});

test("cache paths include the normalized width", () => {
  const path = getThumbnailCachePath("/cache", "/media/a.jpg", 100, 10, 700);
  const expected = getThumbnailCachePath("/cache", "/media/a.jpg", 100, 10, 640);
  assert.equal(path, expected);
});

test("does not regenerate when a cached file exists", { skip: !sharp }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "visorium-thumb-existing-"));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const source = join(dir, "source.png");
  await sharp!({
    create: { width: 32, height: 32, channels: 3, background: "#00ff00" },
  })
    .png()
    .toFile(source);

  const cacheDir = join(dir, "cache");
  const thumbnailer = createThumbnailer({ cacheDir });
  const first = await thumbnailer.get({
    sourcePath: source,
    mtimeMs: 2000,
    size: 456,
    width: 160,
  });

  assert.ok(first);
  const firstStat = await stat(first.path);

  const second = await thumbnailer.get({
    sourcePath: source,
    mtimeMs: 2000,
    size: 456,
    width: 160,
  });

  assert.equal(second?.path, first.path);
  const secondStat = await stat(second!.path);
  assert.equal(secondStat.mtimeMs, firstStat.mtimeMs);
});
