import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

interface StoredEntry {
  mt: number;
  sz: number;
  ar?: string;
}

interface StoredFile {
  version: 1;
  files: Record<string, StoredEntry>;
}

export interface MetadataCacheOptions {
  cacheDir: string;
  key: string;
  saveDebounceMs?: number;
}

export interface MetadataCache {
  get(path: string, mtimeMs: number, size: number): string | undefined;
  set(path: string, mtimeMs: number, size: number, aspectRatio: string): void;
  delete(path: string): void;
  flush(): Promise<void>;
  close(): Promise<void>;
  readonly path: string;
}

export const getMetadataCachePath = (
  cacheDir: string,
  key: string,
): string => {
  const hash = createHash("sha1").update(resolve(key)).digest("hex").slice(0, 16);
  return join(cacheDir, "index", `${hash}.json`);
};

export const loadMetadataCache = async (
  options: MetadataCacheOptions,
): Promise<MetadataCache> => {
  const path = getMetadataCachePath(options.cacheDir, options.key);
  let files: Record<string, StoredEntry> = {};

  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<StoredFile>;
    if (parsed.version === 1 && parsed.files && typeof parsed.files === "object") {
      files = parsed.files;
    }
  } catch {
    files = {};
  }

  const saveDebounceMs = options.saveDebounceMs ?? 1000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let saveChain: Promise<void> = Promise.resolve();

  const writeSnapshot = async () => {
    const snapshot: StoredFile = { version: 1, files };
    await mkdir(dirname(path), { recursive: true });
    const tempPath = `${path}.${process.pid}.tmp`;
    await writeFile(tempPath, JSON.stringify(snapshot));
    await rename(tempPath, path);
  };

  const flush = async () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    saveChain = saveChain.then(writeSnapshot).catch(() => {});
    await saveChain;
  };

  const schedule = () => {
    if (timer !== null) {
      return;
    }

    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, saveDebounceMs);
  };

  return {
    path,
    get(path, mtimeMs, size) {
      const entry = files[path];
      return entry && entry.mt === mtimeMs && entry.sz === size
        ? entry.ar
        : undefined;
    },
    set(path, mtimeMs, size, aspectRatio) {
      files[path] = { mt: mtimeMs, sz: size, ar: aspectRatio };
      schedule();
    },
    delete(path) {
      if (path in files) {
        delete files[path];
        schedule();
      }
    },
    flush,
    async close() {
      await flush();
    },
  };
};
