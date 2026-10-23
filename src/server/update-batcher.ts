import type { FileBatch } from "../shared/events.js";
import type { FileInfo } from "../shared/FileInfo.js";

export interface UpdateBatcherOptions {
  intervalMs?: number;
  onFlush: (batch: FileBatch) => void;
}

export interface UpdateBatcher {
  set(path: string, info: FileInfo): void;
  delete(path: string): void;
  flush(): void;
  stop(): void;
  readonly pending: number;
}

export const createUpdateBatcher = (
  options: UpdateBatcherOptions,
): UpdateBatcher => {
  const intervalMs = options.intervalMs ?? 150;
  const updates = new Map<string, FileInfo>();
  const deletes = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    if (updates.size === 0 && deletes.size === 0) {
      return;
    }

    const batch: FileBatch = {
      set: Array.from(updates.entries()),
      delete: Array.from(deletes),
    };

    updates.clear();
    deletes.clear();
    options.onFlush(batch);
  };

  const schedule = () => {
    if (timer !== null) {
      return;
    }

    timer = setTimeout(flush, intervalMs);
  };

  return {
    set(path, info) {
      deletes.delete(path);
      updates.set(path, info);
      schedule();
    },
    delete(path) {
      updates.delete(path);
      deletes.add(path);
      schedule();
    },
    flush,
    stop() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      updates.clear();
      deletes.clear();
    },
    get pending() {
      return updates.size + deletes.size;
    },
  };
};
