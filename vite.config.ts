import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: join(__dirname, "src/client"),
  build: {
    outDir: join(__dirname, "../../dist"),
  },
});
