import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

export interface PruneCacheOptions {
  maxBytes: number;
  targetRatio?: number;
  dirs?: string[];
}

export interface PruneCacheResult {
  scannedFiles: number;
  removedFiles: number;
  bytesBefore: number;
  bytesAfter: number;
}

interface CacheFile {
  path: string;
  size: number;
  modifiedAt: number;
}

const DEFAULT_DIRS = ["thumbs", "posters"];
const DEFAULT_TARGET_RATIO = 0.8;

export const parseCacheMaxBytes = (
  value: string | undefined,
  fallback = 2 * 1024 * 1024 * 1024,
): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const collectFiles = async (
  directory: string,
  files: CacheFile[],
): Promise<void> => {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(path, files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    try {
      const info = await stat(path);
      files.push({
        path,
        size: info.size,
        modifiedAt: info.atimeMs || info.mtimeMs,
      });
    } catch {
      // The file disappeared while scanning.
    }
  }
};

export const pruneCache = async (
  cacheDir: string,
  options: PruneCacheOptions,
): Promise<PruneCacheResult> => {
  const dirs = options.dirs ?? DEFAULT_DIRS;
  const targetRatio = options.targetRatio ?? DEFAULT_TARGET_RATIO;
  const files: CacheFile[] = [];

  for (const directory of dirs) {
    await collectFiles(join(cacheDir, directory), files);
  }

  const bytesBefore = files.reduce((total, file) => total + file.size, 0);
  if (bytesBefore <= options.maxBytes) {
    return {
      scannedFiles: files.length,
      removedFiles: 0,
      bytesBefore,
      bytesAfter: bytesBefore,
    };
  }

  const targetBytes = Math.max(0, Math.floor(options.maxBytes * targetRatio));
  files.sort((a, b) => a.modifiedAt - b.modifiedAt);

  let bytesAfter = bytesBefore;
  let removedFiles = 0;

  for (const file of files) {
    if (bytesAfter <= targetBytes) {
      break;
    }

    try {
      await unlink(file.path);
      bytesAfter -= file.size;
      removedFiles += 1;
    } catch {
      // Another process may have removed it already.
    }
  }

  return {
    scannedFiles: files.length,
    removedFiles,
    bytesBefore,
    bytesAfter,
  };
};
