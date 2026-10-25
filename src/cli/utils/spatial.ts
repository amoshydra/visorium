import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const coreVersion = (
  JSON.parse(
    readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;

const isSpatialDist = (path: string) =>
  existsSync(join(path, "index.js")) || existsSync(join(path, "dist", "index.js"));

const readPackageVersion = (path: string) => {
  try {
    return (
      JSON.parse(readFileSync(join(path, "package.json"), "utf8")) as {
        version?: string;
      }
    ).version;
  } catch {
    return undefined;
  }
};

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
    const root = path.endsWith("dist") ? dirname(path) : path;
    if (!isSpatialDist(path)) return null;
    return readPackageVersion(root) === coreVersion ? path : null;
  }

  try {
    const require = createRequire(import.meta.url);
    const packagePath = require.resolve("@visorium/spatial/package.json");
    const root = dirname(packagePath);
    const path = join(root, "dist");
    if (!isSpatialDist(path)) return null;
    return readPackageVersion(root) === coreVersion ? path : null;
  } catch {
    return null;
  }
};
