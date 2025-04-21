import react from "@vitejs/plugin-react";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_URL ?? undefined,
  plugins: [react(), topLevelAwait()],
  root: join(__dirname, "src/client"),
  server: {
    allowedHosts: true,
  },
  build: {
    outDir: join(__dirname, "dist"),
    rollupOptions: {
      external:
        process.env.VITE_VISORIUM_MODE === "demo"
          ? []
          : [
              fileURLToPath(
                new URL(
                  "./src/client/hooks/useFileServerSocket/demo.ts",
                  import.meta.url,
                ),
              ),
            ],
    },
  },
});
