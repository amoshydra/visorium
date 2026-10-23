import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io } from "socket.io-client";
import { FileEvent, type FileBatch } from "../../../shared/events";
import type { FileInfo } from "../../../shared/FileInfo";
import { applyFileBatch } from "../../lib/file-index";
import { toFileUrl, toThumbnailUrl } from "../../lib/urls";
import type { MediaInfo, ServerFileEntry } from "../useFileServerSocket.types";

const params = new URLSearchParams(window.location.search);
const defaultSearch = params.get("search") || "";
const defaultOrder = params.get("order") === "desc" ? "desc" : "asc";

const UPDATE_FLUSH_MS = 100;

export const useFileServerSocket = (
  search = defaultSearch,
  order = defaultOrder,
): MediaInfo[] => {
  const [record, setRecord] = useState<Record<string, FileInfo>>({});

  useEffect(() => {
    const socketInstance = io(window.location.origin);
    const pendingSet = new Map<string, FileInfo>();
    const pendingDelete = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelFlush = () => {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    };

    const clearPending = () => {
      pendingSet.clear();
      pendingDelete.clear();
    };

    const flush = () => {
      flushTimer = null;

      if (pendingSet.size === 0 && pendingDelete.size === 0) {
        return;
      }

      const batch: FileBatch = {
        set: Array.from(pendingSet.entries()),
        delete: Array.from(pendingDelete),
      };
      clearPending();

      startTransition(() => {
        setRecord((current) => applyFileBatch(current, batch));
      });
    };

    const scheduleFlush = () => {
      if (flushTimer === null) {
        flushTimer = setTimeout(flush, UPDATE_FLUSH_MS);
      }
    };

    socketInstance.on(FileEvent.Pending, () => {
      cancelFlush();
      clearPending();
      setRecord({});
    });
    socketInstance.on(FileEvent.Initial, (initialFiles: ServerFileEntry[]) => {
      cancelFlush();
      clearPending();
      setRecord(Object.fromEntries(initialFiles));
    });
    socketInstance.on(FileEvent.Update, (batch: FileBatch) => {
      for (const [path, info] of batch.set) {
        pendingDelete.delete(path);
        pendingSet.set(path, info);
      }
      for (const path of batch.delete) {
        pendingSet.delete(path);
        pendingDelete.add(path);
      }
      scheduleFlush();
    });
    socketInstance.on(FileEvent.Delete, (path: string) => {
      pendingSet.delete(path);
      pendingDelete.add(path);
      scheduleFlush();
    });

    return () => {
      cancelFlush();
      socketInstance.disconnect();
    };
  }, []);

  const deferredSearch = useDeferredValue(search || "");

  const files = useMemo(() => {
    const regexp = deferredSearch ? new RegExp(deferredSearch) : null;
    const filter = regexp
      ? ([name]: [string, unknown]) => regexp.test(name)
      : () => true;
    const sort =
      order === "desc"
        ? (
            [, { t: a }]: [unknown, { t: number }],
            [, { t: b }]: [unknown, { t: number }],
          ) => b - a
        : (
            [, { t: a }]: [unknown, { t: number }],
            [, { t: b }]: [unknown, { t: number }],
          ) => a - b;

    return Object.entries(record)
      .filter(filter)
      .sort(sort)
      .map(
        ([name, { ar: aspectRatio, mt: modifiedTime, sz }]): MediaInfo => ({
          src: toFileUrl(location.origin, name, modifiedTime),
          thumbSrc: toThumbnailUrl(location.origin, name, modifiedTime),
          name,
          aspectRatio,
          mtime: modifiedTime,
          size: sz,
        }),
      );
  }, [record, order, deferredSearch]);

  return files;
};
