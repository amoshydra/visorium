import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    react(),
    {
      // The XR emulator pulls in several MB of room/device assets. Visorium
      // disables the emulator, so replace its dynamic import at build time.
      name: "visorium-drop-xr-emulator",
      enforce: "pre",
      transform(code, id) {
        if (id.includes("@pmndrs/xr/dist/store.js")) {
          return code.replace(
            "const { emulate } = await import('./emulate.js');",
            "const { emulate } = { emulate: () => { throw new Error('The XR emulator is disabled.'); } };",
          );
        }
        return null;
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.tsx"),
        lightbox: resolve(__dirname, "src/lightbox.tsx"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
  },
});
