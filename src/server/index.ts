import express, { type Express } from "express";
import ViteExpress from "vite-express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
  io: Server;
}
// Start the server
export const startServer = (optionPort = 3000) => {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : optionPort;
  ViteExpress.config({
    viteConfigFile: join(__dirname, "../../vite.config.ts"),
  });

  return new Promise<StartServerReturn>((resolve) => {
    const server = httpServer.listen(port, "0.0.0.0", () => {
      resolve({ app, port, io });
    });
    ViteExpress.bind(app, server);
  });
};
