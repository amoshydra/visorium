import chokidar from "chokidar";
import express from "express";
import type { Stats } from "node:fs";
import { isAbsolute, normalize, relative, resolve, sep } from "node:path";
import { Time } from "time-chainer";
import { startServer } from "../../server/index.js";
import {
  parseCacheMaxBytes,
  pruneCache,
} from "../../server/cache-prune.js";
import { loadMetadataCache } from "../../server/metadata-cache.js";
import { createQueue } from "../../server/queue.js";
import {
  createThumbnailer,
  getDefaultCacheDir,
  normalizeThumbnailWidth,
} from "../../server/thumbnails.js";
import { createUpdateBatcher } from "../../server/update-batcher.js";
import { createVideoPosterer } from "../../server/video-posters.js";
import { FileEvent } from "../../shared/events.js";
import { mediaRegExp, videoRegExp } from "../../shared/file-extension.js";
import type { FileInfo } from "../../shared/FileInfo.js";
import { getMimeType } from "../../shared/mime.js";
import { logger } from "../utils/logger.js";
import { probeAspectRatio } from "../utils/media-prober.js";
import { createScanFilter } from "../utils/scan-filter.js";

interface InitOptions {
  port: string;
  ext: string[];
  includeHidden: boolean;
  ignore: string[];
}

let counter = 0;

const isOutside = (path: string) =>
  path === ".." ||
  path.startsWith(`..${sep}`) ||
  path.startsWith("../") ||
  path.startsWith("..\\") ||
  isAbsolute(path);

const resolveMediaPath = (raw: unknown) => {
  const rawPath = typeof raw === "string" ? raw : "";
  const relativePath = normalize(rawPath);

  if (!rawPath || !relativePath || isOutside(relativePath)) {
    return null;
  }

  const cwd = process.cwd();
  const absolutePath = resolve(cwd, relativePath);

  if (isOutside(relative(cwd, absolutePath))) {
    return null;
  }

  return { relativePath, absolutePath };
};

const createFileEntry = (stat: Stats | undefined, t: number): FileInfo => ({
  mt: stat?.mtimeMs || 0,
  sz: stat?.size || 0,
  t,
});

export async function start(options: InitOptions) {
  logger.info("Starting Visorium...");

  const scanFilter = createScanFilter({
    includeHidden: options.includeHidden,
    ignore: options.ignore,
  });

  if (options.includeHidden) {
    logger.info("Including hidden files and folders.");
  } else {
    logger.info(
      "Skipping hidden files and folders. Use --include-hidden to scan them.",
    );
  }
  if (options.ignore.length > 0) {
    logger.info(`Ignoring patterns: ${options.ignore.join(", ")}`);
  }

  const cacheDir = getDefaultCacheDir();
  const metadataCache = await loadMetadataCache({
    cacheDir,
    key: process.cwd(),
  });
  const { app, port, io } = await startServer(parseInt(options.port, 10));
  const fileMap = new Map<string, FileInfo>();
  const thumbnailer = createThumbnailer({ cacheDir });
  const posterer = createVideoPosterer({ cacheDir });
  const probeQueue = createQueue(4);
  const { promise: readyPromise, resolve: resolveReady } =
    withPromiseResolver<void>();
  let ready = false;
  let watcherError: string | null = null;

  void pruneCache(cacheDir, {
    maxBytes: parseCacheMaxBytes(process.env.VISORIUM_CACHE_MAX_BYTES),
  })
    .then((result) => {
      if (result.removedFiles > 0) {
        logger.info(
          `Pruned ${result.removedFiles} cached files (${result.bytesBefore} -> ${result.bytesAfter} bytes)`,
        );
      }
    })
    .catch((error) => {
      logger.error("Failed to prune cache", error);
    });

  const batcher = createUpdateBatcher({
    intervalMs: 150,
    onFlush: (batch) => {
      io.emit(FileEvent.Update, batch);
    },
  });

  app.use(
    "/files",
    express.static(process.cwd(), {
      setHeaders: (res, path) => {
        const contentType = getMimeType(path);
        if (contentType) {
          res.setHeader("Content-Type", contentType);
        }
      },
      dotfiles: "allow",
      maxAge: Time.days(1),
    }),
  );

  app.get("/thumb", async (req, res) => {
    const resolved = resolveMediaPath(req.query.path);
    if (!resolved) {
      res.status(400).end();
      return;
    }

    const { relativePath, absolutePath } = resolved;
    const entry = fileMap.get(relativePath);
    if (!entry) {
      res.status(404).end();
      return;
    }

    const thumbnail = await thumbnailer.get({
      sourcePath: absolutePath,
      mtimeMs: entry.mt,
      size: entry.sz ?? 0,
      width: normalizeThumbnailWidth(req.query.w),
    });

    if (!thumbnail) {
      res.sendFile(absolutePath, { dotfiles: "allow" });
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (thumbnail.width) {
      headers["X-Width"] = String(thumbnail.width);
    }
    if (thumbnail.height) {
      headers["X-Height"] = String(thumbnail.height);
    }

    // The cache lives under a dot-directory such as ~/.cache, which sendFile
    // ignores by default.
    res.sendFile(thumbnail.path, { headers, dotfiles: "allow" });
  });

  app.get("/poster", async (req, res) => {
    const resolved = resolveMediaPath(req.query.path);
    if (!resolved) {
      res.status(400).end();
      return;
    }

    const { relativePath, absolutePath } = resolved;
    if (!videoRegExp.test(relativePath)) {
      res.status(404).end();
      return;
    }

    const entry = fileMap.get(relativePath);
    if (!entry) {
      res.status(404).end();
      return;
    }

    const poster = await posterer.get({
      sourcePath: absolutePath,
      mtimeMs: entry.mt,
      size: entry.sz ?? 0,
      width: normalizeThumbnailWidth(req.query.w),
    });

    if (!poster) {
      res.status(404).end();
      return;
    }

    res.sendFile(poster.path, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      dotfiles: "allow",
    });
  });

  logger.info(`Visorium server started on port ${port}`);

  io.on("connection", async (socket) => {
    logger.info("Client connected");
    socket.emit(FileEvent.Pending);
    await readyPromise;
    socket.emit(FileEvent.Initial, Array.from(fileMap.entries()));
    if (watcherError) {
      socket.emit(FileEvent.Error, watcherError);
    }
    socket.on("disconnect", () => {
      logger.info("Client disconnected");
    });
  });

  const probe = (path: string, entry: FileInfo) => {
    void probeQueue(() => probeAspectRatio(path)).then((aspectRatio) => {
      if (!aspectRatio || fileMap.get(path) !== entry) {
        return;
      }

      entry.ar = aspectRatio;
      metadataCache.set(path, entry.mt, entry.sz ?? 0, aspectRatio);

      if (ready) {
        batcher.set(path, entry);
      }
    });
  };

  const watcher = chokidar.watch(".", {
    ignored: (file, stats) => {
      if (scanFilter(file)) return true;
      return !!(
        stats?.isFile() &&
        !mediaRegExp.test(file) &&
        !options.ext.some((ext) => file.endsWith(ext))
      );
    },
    persistent: true,
    cwd: process.cwd(),
  });

  watcher
    .on("add", (path, stat) => {
      const t = counter++;
      const entry = createFileEntry(stat, t);
      const cachedAspectRatio = metadataCache.get(
        path,
        entry.mt,
        entry.sz ?? 0,
      );
      if (cachedAspectRatio) {
        entry.ar = cachedAspectRatio;
      }
      fileMap.set(path, entry);

      if (ready) {
        batcher.set(path, entry);
      }

      logger.info(`File added: ${path}`);
      if (!cachedAspectRatio) {
        probe(path, entry);
      }
    })
    .on("change", (path, stat) => {
      const t = fileMap.get(path)?.t ?? counter++;
      const entry = createFileEntry(stat, t);
      const cachedAspectRatio = metadataCache.get(
        path,
        entry.mt,
        entry.sz ?? 0,
      );
      if (cachedAspectRatio) {
        entry.ar = cachedAspectRatio;
      }
      fileMap.set(path, entry);

      if (ready) {
        batcher.set(path, entry);
      }

      logger.info(`File changed: ${path}`);
      if (!cachedAspectRatio) {
        probe(path, entry);
      }
    })
    .on("unlink", (path) => {
      fileMap.delete(path);
      metadataCache.delete(path);

      if (ready) {
        batcher.delete(path);
      }

      logger.info(`File removed: ${path}`);
    })
    .on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      watcherError = message;
      io.emit(FileEvent.Error, message);
      logger.error("Watcher error", error);

      if (!ready) {
        ready = true;
        resolveReady();
      }
    })
    .on("ready", () => {
      ready = true;
      logger.info(`Visorium is ready: http://localhost:${port}`);
      resolveReady();
    });
}

interface WithPromiseResolver<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (v: unknown) => void;
}
const withPromiseResolver = <T>(): WithPromiseResolver<T> => {
  let resolve!: WithPromiseResolver<T>["resolve"];
  let reject!: WithPromiseResolver<T>["reject"];
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
