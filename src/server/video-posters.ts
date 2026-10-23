import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createQueue } from "./queue.js";
import {
  getDefaultCacheDir,
  normalizeThumbnailWidth,
} from "./thumbnails.js";

export interface VideoPosterRequest {
  sourcePath: string;
  mtimeMs: number;
  size: number;
  width?: number;
}

export interface VideoPosterResult {
  path: string;
}

export interface VideoPosterer {
  get(request: VideoPosterRequest): Promise<VideoPosterResult | null>;
  readonly cacheDir: string;
}

type Runner = (args: string[]) => Promise<boolean>;

export interface VideoPostererOptions {
  cacheDir?: string;
  concurrency?: number;
  ffmpegPath?: string;
  run?: Runner;
  available?: boolean;
}

export const getVideoPosterCachePath = (
  cacheDir: string,
  sourcePath: string,
  mtimeMs: number,
  size: number,
  width: number,
): string => {
  const hash = createHash("sha1")
    .update(
      `${resolve(sourcePath)}\0${mtimeMs}\0${size}\0${normalizeThumbnailWidth(width)}`,
    )
    .digest("hex");

  return join(cacheDir, "posters", hash.slice(0, 2), `${hash}.jpg`);
};

const createFfmpegRunner = (ffmpegPath: string): Runner => {
  return (args) => {
    return new Promise<boolean>((resolvePromise) => {
      let settled = false;
      const settle = (value: boolean) => {
        if (!settled) {
          settled = true;
          resolvePromise(value);
        }
      };

      const child = spawn(ffmpegPath, args, {
        stdio: ["ignore", "ignore", "ignore"],
      });
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        settle(false);
      }, 15_000);

      child.once("error", () => {
        clearTimeout(timeout);
        settle(false);
      });
      child.once("close", (code) => {
        clearTimeout(timeout);
        settle(code === 0);
      });
    });
  };
};

export const createVideoPosterer = (
  options: VideoPostererOptions = {},
): VideoPosterer => {
  const cacheDir = options.cacheDir ?? getDefaultCacheDir();
  const ffmpegPath = options.ffmpegPath ?? process.env.FFMPEG_PATH ?? "ffmpeg";
  const run = options.run ?? createFfmpegRunner(ffmpegPath);
  const queue = createQueue(options.concurrency ?? 2);
  const inFlight = new Map<string, Promise<VideoPosterResult | null>>();
  const availablePromise = Promise.resolve(
    options.available ?? run(["-version"]),
  );

  return {
    cacheDir,
    async get(request) {
      if (!(await availablePromise)) {
        return null;
      }

      const width = normalizeThumbnailWidth(request.width);
      const cachePath = getVideoPosterCachePath(
        cacheDir,
        request.sourcePath,
        request.mtimeMs,
        request.size,
        width,
      );

      const cached = await stat(cachePath).catch(() => null);
      if (cached && cached.size > 0) {
        return { path: cachePath };
      }

      const existing = inFlight.get(cachePath);
      if (existing) {
        return existing;
      }

      const pending = queue(async () => {
        const tempPath = `${cachePath}.${process.pid}.${Math.random()
          .toString(36)
          .slice(2)}.tmp.jpg`;

        try {
          await mkdir(dirname(cachePath), { recursive: true });

          const baseArgs = [
            "-v",
            "error",
            "-ss",
            "1",
            "-i",
            request.sourcePath,
            "-frames:v",
            "1",
            "-an",
            "-vf",
            `scale=${width}:-2`,
            "-q:v",
            "4",
            "-y",
          ];

          let ok = await run([...baseArgs, tempPath]);
          if (!ok) {
            ok = await run([
              ...baseArgs.slice(0, 3),
              "0",
              ...baseArgs.slice(4),
              tempPath,
            ]);
          }

          if (!ok) {
            await unlink(tempPath).catch(() => {});
            return null;
          }

          await rename(tempPath, cachePath);
          return { path: cachePath };
        } catch {
          await unlink(tempPath).catch(() => {});
          return null;
        }
      }).finally(() => {
        inFlight.delete(cachePath);
      });

      inFlight.set(cachePath, pending);
      return pending;
    },
  };
};
