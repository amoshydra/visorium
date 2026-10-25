import express, { type Express } from "express";
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
export const startServer = async (
  optionPort = 3000,
  optionHost = "127.0.0.1",
  auth?: Auth,
  spatialDir?: string,
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

  if (spatialDir) {
    app.get("/api/capabilities", (_req, res) => {
      res.json({ spatial: true, assetsBase: "/spatial/" });
    });
    app.use(
      "/spatial",
      express.static(spatialDir, {
        dotfiles: "deny",
      }),
    );
  }

  let bindVite: (() => void) | undefined;

  if (process.env.NODE_ENV === "development") {
    const { default: ViteExpress } = await import("vite-express");
    ViteExpress.config({
      viteConfigFile: join(__dirname, "../../vite.config.ts"),
    });
    bindVite = () => ViteExpress.bind(app, httpServer);
  } else {
    // The production package intentionally does not install Vite. This static
    // server is the entire production frontend path.
    app.use("/", express.static(join(__dirname, "../../dist")));
  }

  return new Promise<StartServerReturn>((resolve) => {
    httpServer.listen(port, optionHost, () => {
      bindVite?.();
      resolve({ app, port, host: optionHost, io });
    });
  });
};
