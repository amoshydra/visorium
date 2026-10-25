import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const isSpatialDist = (path: string) =>
  existsSync(join(path, "index.js")) || existsSync(join(path, "dist", "index.js"));

const normalizeSpatialPath = (path: string) => {
  const absolute = resolve(path);
  return existsSync(join(absolute, "dist", "index.js"))
    ? join(absolute, "dist")
    : absolute;
};

/**
 * Resolve the optional spatial package from either an explicit development
 * path or the npx/local sibling environment. The core package never imports
 * the spatial package statically.
 */
export const resolveSpatialDist = (): string | null => {
  const explicit = process.env.VISORIUM_SPATIAL_DIR;
  if (explicit) {
    const path = normalizeSpatialPath(explicit);
    return isSpatialDist(path) ? path : null;
  }

  try {
    const require = createRequire(import.meta.url);
    const packagePath = require.resolve("@visorium/spatial/package.json");
    const path = join(dirname(packagePath), "dist");
    return isSpatialDist(path) ? path : null;
  } catch {
    return null;
  }
};
