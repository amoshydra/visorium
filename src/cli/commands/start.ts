import chokidar from "chokidar";
import express from "express";
import { Stats } from "node:fs";
import { sep } from "node:path";
import { Time } from "time-chainer";
import { startServer } from "../../server/index.js";
import { FileEvent } from "../../shared/events.js";
import { mediaRegExp } from "../../shared/file-extension.js";
import { type FileInfo } from "../../shared/FileInfo.js";
import { getMimeType } from "../../shared/mime.js";
import { logger } from "../utils/logger.js";
import { probeAspectRatio } from "../utils/media-prober.js";

interface InitOptions {
  port: string;
  ext: string[];
}

let counter = 0;

export async function start(options: InitOptions) {
  logger.info("Starting Visorium...");

  const { app, port, io } = await startServer(parseInt(options.port, 10));
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
  logger.info(`Visorium server started on port ${port}`);

  setTimeout(() => {
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

    const fileMap = new Map<string, FileInfo>();

    const { promise, resolve } = withPromiseResolver<void>();

    watcher
      .on("add", async (path, stat) => {
        const t = counter++;
        const fileEntry = await prepareFileEntry(path, stat, t);
        fileMap.set(path, fileEntry);
        io.emit(FileEvent.Update, [path, fileEntry]);
        logger.info(`File added: ${path}`);
      })
      .on("change", async (path, stat) => {
        const t = fileMap.get(path)?.t ?? counter++;
        const fileEntry = await prepareFileEntry(path, stat, t);

        fileMap.set(path, fileEntry);
        io.emit(FileEvent.Update, [path, fileEntry]);
        logger.info(`File changed: ${path}`);
      })
      .on("unlink", async (path) => {
        fileMap.delete(path);
        io.emit(FileEvent.Delete, path);
        logger.info(`File removed: ${path}`);
      })
      .on("ready", () => {
        logger.info(`Visorium is ready: http://localhost:${port}`);
        resolve();
      });

    io.on("connection", async (socket) => {
      logger.info("Client connected");
      io.emit(FileEvent.Pending);
      await promise;
      io.emit(FileEvent.Initial, Array.from(fileMap.entries()));
      socket.on("disconnect", () => {
        logger.info("Client disconnected");
      });
    });
  }, 2000);
}

const prepareFileEntry = async (
  path: string,
  stat: Stats | undefined,
  t: number,
): Promise<FileInfo> => {
  return {
    ar: await probeAspectRatio(path),
    mt: stat?.mtimeMs || 0,
    t,
  };
};

interface WithPromiseResolver<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (v: unknown) => void;
}
const withPromiseResolver = <T>(): WithPromiseResolver<T> => {
  let resolve: WithPromiseResolver<T>["resolve"];
  let reject: WithPromiseResolver<T>["reject"];
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // @ts-ignore
  return { promise, resolve, reject };
};
