import chokidar from "chokidar";
import express from "express";
import type { Stats } from "node:fs";
import { isAbsolute, normalize, relative, resolve, sep } from "node:path";
import { Time } from "time-chainer";
import { startServer } from "../../server/index.js";
import { createQueue } from "../../server/queue.js";
import {
  createThumbnailer,
  getDefaultCacheDir,
  normalizeThumbnailWidth,
} from "../../server/thumbnails.js";
import { createUpdateBatcher } from "../../server/update-batcher.js";
import { FileEvent } from "../../shared/events.js";
import { mediaRegExp } from "../../shared/file-extension.js";
import type { FileInfo } from "../../shared/FileInfo.js";
import { getMimeType } from "../../shared/mime.js";
import { logger } from "../utils/logger.js";
import { probeAspectRatio } from "../utils/media-prober.js";

interface InitOptions {
  port: string;
  ext: string[];
}

let counter = 0;

const isOutside = (path: string) =>
  path === ".." ||
  path.startsWith(`..${sep}`) ||
  path.startsWith("../") ||
  path.startsWith("..\\") ||
  isAbsolute(path);

const createFileEntry = (stat: Stats | undefined, t: number): FileInfo => ({
  mt: stat?.mtimeMs || 0,
  sz: stat?.size || 0,
  t,
});

export async function start(options: InitOptions) {
  logger.info("Starting Visorium...");

  const { app, port, io } = await startServer(parseInt(options.port, 10));
  const fileMap = new Map<string, FileInfo>();
  const thumbnailer = createThumbnailer({ cacheDir: getDefaultCacheDir() });
  const probeQueue = createQueue(4);
  const { promise: readyPromise, resolve: resolveReady } =
    withPromiseResolver<void>();
  let ready = false;

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
    const rawPath = typeof req.query.path === "string" ? req.query.path : "";
    const relativePath = normalize(rawPath);

    if (!rawPath || !relativePath || isOutside(relativePath)) {
      res.status(400).end();
      return;
    }

    const cwd = process.cwd();
    const absolutePath = resolve(cwd, relativePath);

    if (isOutside(relative(cwd, absolutePath))) {
      res.status(400).end();
      return;
    }

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
      res.sendFile(absolutePath);
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

    res.sendFile(thumbnail.path, { headers });
  });

  logger.info(`Visorium server started on port ${port}`);

  io.on("connection", async (socket) => {
    logger.info("Client connected");
    socket.emit(FileEvent.Pending);
    await readyPromise;
    socket.emit(FileEvent.Initial, Array.from(fileMap.entries()));
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

      if (ready) {
        batcher.set(path, entry);
      }
    });
  };

  const watcher = chokidar.watch(".", {
    ignored: (file, stats) => {
      if (file.includes(`${sep}node_modules${sep}`)) return true;
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
      fileMap.set(path, entry);

      if (ready) {
        batcher.set(path, entry);
      }

      logger.info(`File added: ${path}`);
      probe(path, entry);
    })
    .on("change", (path, stat) => {
      const t = fileMap.get(path)?.t ?? counter++;
      const entry = createFileEntry(stat, t);
      fileMap.set(path, entry);

      if (ready) {
        batcher.set(path, entry);
      }

      logger.info(`File changed: ${path}`);
      probe(path, entry);
    })
    .on("unlink", (path) => {
      fileMap.delete(path);

      if (ready) {
        batcher.delete(path);
      }

      logger.info(`File removed: ${path}`);
    })
    .on("error", (error) => {
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
