import { createHash } from "node:crypto";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createQueue } from "./queue.js";

export const THUMBNAIL_WIDTHS = [160, 320, 480, 640, 960, 1280, 1600, 2048];
export const DEFAULT_THUMBNAIL_WIDTH = 640;
export const DEFAULT_THUMBNAIL_QUALITY = 72;
export const DEFAULT_THUMBNAIL_CONCURRENCY = 4;
export const MAX_THUMBNAIL_WIDTH = 2048;

interface SharpInstance {
  rotate(): SharpInstance;
  resize(options: {
    width: number;
    withoutEnlargement?: boolean;
  }): SharpInstance;
  webp(options: { quality: number }): SharpInstance;
  toFile(path: string): Promise<{ width: number; height: number }>;
  metadata(): Promise<{ width?: number; height?: number }>;
}

type SharpFactory = (
  input: string,
  options?: { failOn?: "none" | "error" },
) => SharpInstance;

export interface ThumbnailRequest {
  sourcePath: string;
  mtimeMs: number;
  size: number;
  width?: number;
}

export interface ThumbnailResult {
  path: string;
  width?: number;
  height?: number;
}

export interface Thumbnailer {
  get(request: ThumbnailRequest): Promise<ThumbnailResult | null>;
  readonly cacheDir: string;
}

export interface ThumbnailerOptions {
  cacheDir?: string;
  concurrency?: number;
  quality?: number;
  maxWidth?: number;
  sharpLoader?: () => Promise<SharpFactory | null>;
}

export const getDefaultCacheDir = (): string => {
  if (process.env.VISORIUM_CACHE_DIR) {
    return process.env.VISORIUM_CACHE_DIR;
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Caches", "visorium");
  }
  if (process.platform === "win32") {
    return join(
      process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
      "visorium",
    );
  }
  return join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "visorium");
};

export const normalizeThumbnailWidth = (
  value: unknown,
  maxWidth = MAX_THUMBNAIL_WIDTH,
): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Math.min(DEFAULT_THUMBNAIL_WIDTH, maxWidth);
  }

  const clamped = Math.min(Math.max(Math.round(parsed), 1), maxWidth);
  const allowed = THUMBNAIL_WIDTHS.filter((width) => width <= maxWidth);
  const candidates = allowed.length > 0 ? allowed : [maxWidth];

  return candidates.reduce((best, width) => {
    return Math.abs(width - clamped) < Math.abs(best - clamped) ? width : best;
  }, candidates[0]);
};

export const getThumbnailCachePath = (
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

  return join(cacheDir, "thumbs", hash.slice(0, 2), `${hash}.webp`);
};

const loadSharp = async (): Promise<SharpFactory | null> => {
  try {
    // Use a variable specifier so TypeScript does not require sharp at build
    // time; it is an optional dependency.
    const moduleName = "sharp";
    const module = (await import(moduleName)) as {
      default?: SharpFactory;
    } & SharpFactory;

    return module.default ?? module;
  } catch {
    return null;
  }
};

export const createThumbnailer = (
  options: ThumbnailerOptions = {},
): Thumbnailer => {
  const cacheDir = options.cacheDir ?? getDefaultCacheDir();
  const maxWidth = options.maxWidth ?? MAX_THUMBNAIL_WIDTH;
  const quality = options.quality ?? DEFAULT_THUMBNAIL_QUALITY;
  const queue = createQueue(
    options.concurrency ?? DEFAULT_THUMBNAIL_CONCURRENCY,
  );
  const sharpPromise = (options.sharpLoader ?? loadSharp)();
  const inFlight = new Map<string, Promise<ThumbnailResult | null>>();

  return {
    cacheDir,
    async get(request) {
      const width = normalizeThumbnailWidth(request.width, maxWidth);
      const cachePath = getThumbnailCachePath(
        cacheDir,
        request.sourcePath,
        request.mtimeMs,
        request.size,
        width,
      );

      const cached = await stat(cachePath).catch(() => null);
      const sharp = await sharpPromise;

      if (cached && cached.size > 0) {
        if (!sharp) {
          return { path: cachePath };
        }

        const metadata = await sharp(cachePath)
          .metadata()
          .catch(() => undefined);

        return {
          path: cachePath,
          width: metadata?.width,
          height: metadata?.height,
        };
      }

      if (!sharp) {
        return null;
      }

      const existing = inFlight.get(cachePath);
      if (existing) {
        return existing;
      }

      const pending = queue(async () => {
        const tempPath = `${cachePath}.${process.pid}.${Math.random()
          .toString(36)
          .slice(2)}.tmp`;

        try {
          await mkdir(dirname(cachePath), { recursive: true });

          const info = await sharp(request.sourcePath, { failOn: "none" })
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality })
            .toFile(tempPath);

          await rename(tempPath, cachePath);

          return {
            path: cachePath,
            width: info.width,
            height: info.height,
          };
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
