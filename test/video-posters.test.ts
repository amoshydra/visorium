import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createVideoPosterer,
  getVideoPosterCachePath,
} from "../src/server/video-posters.js";

const makeTempDir = (t: { after: (fn: () => Promise<void>) => void }) => {
  return mkdtemp(join(tmpdir(), "visorium-poster-")).then((dir) => {
    t.after(() => rm(dir, { recursive: true, force: true }));
    return dir;
  });
};

const createRunner = (calls: string[][], content = "poster") => {
  return async (args: string[]) => {
    calls.push(args);
    const output = args[args.length - 1];
    if (output.endsWith(".jpg")) {
      await writeFile(output, content);
    }
    return true;
  };
};

test("builds stable poster cache paths", () => {
  const first = getVideoPosterCachePath("/cache", "/media/a.mp4", 1, 2, 640);
  const second = getVideoPosterCachePath("/cache", "/media/a.mp4", 1, 2, 640);
  const changed = getVideoPosterCachePath("/cache", "/media/a.mp4", 2, 2, 640);

  assert.equal(first, second);
  assert.notEqual(first, changed);
  assert.match(first, /posters[\\/].+\.jpg$/);
});

test("generates and reuses a poster", async (t) => {
  const cacheDir = await makeTempDir(t);
  const calls: string[][] = [];
  const posterer = createVideoPosterer({
    cacheDir,
    available: true,
    run: createRunner(calls),
  });

  const request = {
    sourcePath: join(cacheDir, "video.mp4"),
    mtimeMs: 100,
    size: 200,
    width: 640,
  };

  const first = await posterer.get(request);
  assert.ok(first);
  assert.equal(await readFile(first.path, "utf8"), "poster");
  const callCount = calls.length;
  assert.ok(callCount > 0);

  const second = await posterer.get(request);
  assert.equal(second?.path, first.path);
  assert.equal(calls.length, callCount);
});

test("returns null when ffmpeg is unavailable", async (t) => {
  const cacheDir = await makeTempDir(t);
  const calls: string[][] = [];
  const posterer = createVideoPosterer({
    cacheDir,
    available: false,
    run: createRunner(calls),
  });

  const result = await posterer.get({
    sourcePath: join(cacheDir, "video.mp4"),
    mtimeMs: 100,
    size: 200,
    width: 640,
  });

  assert.equal(result, null);
  assert.equal(calls.length, 0);
});

test("returns null when ffmpeg fails both attempts", async (t) => {
  const cacheDir = await makeTempDir(t);
  const calls: string[][] = [];
  const posterer = createVideoPosterer({
    cacheDir,
    available: true,
    run: async (args) => {
      calls.push(args);
      return false;
    },
  });

  const result = await posterer.get({
    sourcePath: join(cacheDir, "video.mp4"),
    mtimeMs: 100,
    size: 200,
    width: 640,
  });

  assert.equal(result, null);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][3], "1");
  assert.equal(calls[1][3], "0");
});

test("invalidates posters when the source changes", async (t) => {
  const cacheDir = await makeTempDir(t);
  const calls: string[][] = [];
  const posterer = createVideoPosterer({
    cacheDir,
    available: true,
    run: createRunner(calls),
  });

  const base = {
    sourcePath: join(cacheDir, "video.mp4"),
    size: 200,
    width: 640,
  };

  const first = await posterer.get({ ...base, mtimeMs: 100 });
  const second = await posterer.get({ ...base, mtimeMs: 101 });

  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first.path, second.path);
  await stat(second.path);
});
