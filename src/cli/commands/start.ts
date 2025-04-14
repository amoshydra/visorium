import chokidar from "chokidar";
import express from "express";
import { startServer } from "../../server/index.js";
import { FileEvent } from "../../shared/events.js";
import { logger } from "../utils/logger.js";

interface InitOptions {
  name?: string;
}

const mediaExtension = /\.(gif|webp|png|jpg|jpeg|mp4|mov)$/i;

export async function start(options: InitOptions) {
  logger.info("Starting Visorium...");
  const watcher = chokidar.watch(".", {
    ignored: (file, stats) => !!(stats?.isFile() && !mediaExtension.test(file)),
    persistent: true,
    cwd: process.cwd(),
  });
  const { app, port, io } = await startServer();
  app.use("/files", express.static(process.cwd()));

  logger.info(`Visorium server started on port ${port}`);

  const fileSet = new Set();

  const { promise, resolve } = withPromiseResolver<void>();
  watcher
    .on("add", (path) => {
      fileSet.add(path);
      io.emit(FileEvent.Update, path);
      logger.info(`File added: ${path}`);
    })
    .on("change", (path) => {
      io.emit(FileEvent.Update, path);
      logger.info(`File changed: ${path}`);
    })
    .on("unlink", (path) => {
      fileSet.delete(path);
      io.emit(FileEvent.Update, path);
      logger.info(`File removed: ${path}`);
    })
    .on("ready", () => {
      logger.info("File watcher is ready");
      resolve();
    });

  io.on("connection", async (socket) => {
    logger.info("Client connected");
    io.emit(FileEvent.Pending);
    await promise;
    io.emit(FileEvent.Initial, Array.from(fileSet.values()));
    socket.on("disconnect", () => {
      logger.info("Client disconnected");
    });
  });
}

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
  return { promise, resolve, reject };
};
