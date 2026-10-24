import express, { type Express } from "express";
import ViteExpress from "vite-express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Auth } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

export interface StartServerReturn {
  app: Express;
  port: number;
  host: string;
  io: Server;
}
// Start the server
export const startServer = (
  optionPort = 3000,
  optionHost = "127.0.0.1",
  auth?: Auth,
) => {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : optionPort;

  if (auth) {
    app.use(express.urlencoded({ extended: false }));
    app.use(auth.middleware);
    io.use((socket, next) => {
      if (auth.authorizeSocket(socket.request)) {
        next();
      } else {
        next(new Error("unauthorized"));
      }
    });
  }

  if (process.env.NODE_ENV === "development") {
    ViteExpress.config({
      viteConfigFile: join(__dirname, "../../vite.config.ts"),
    });
  } else {
    ViteExpress.config({
      mode: "production",
      inlineViteConfig: {
        root: join(__dirname, "../.."),
        base: process.env.BASE_URL,
      },
    });
    // Serve static files from the dist directory
    // somehow vite-express does not serve files from the dist directory
    app.use("/", express.static(join(__dirname, "../../dist")));
  }

  return new Promise<StartServerReturn>((resolve) => {
    const server = httpServer.listen(port, optionHost, () => {
      resolve({ app, port, host: optionHost, io });
    });
    ViteExpress.bind(app, server);
  });
};
