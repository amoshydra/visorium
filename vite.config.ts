import react from "@vitejs/plugin-react";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_URL ?? undefined,
  plugins: [react()],
  root: join(__dirname, "src/client"),
  build: {
    outDir: join(__dirname, "dist"),
  },
});
