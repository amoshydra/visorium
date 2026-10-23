import type { FileBatch } from "../../shared/events";
import type { FileInfo } from "../../shared/FileInfo";

export type FileRecord = Record<string, FileInfo>;

export const applyFileBatch = (
  record: FileRecord,
  batch: FileBatch,
): FileRecord => {
  const next = { ...record };

  for (const [path, info] of batch.set) {
    next[path] = info;
  }
  for (const path of batch.delete) {
    delete next[path];
  }

  return next;
};
