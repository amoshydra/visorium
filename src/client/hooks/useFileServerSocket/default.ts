import { startTransition, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { FileEvent, type FileBatch } from "../../../shared/events";
import type { FileInfo } from "../../../shared/FileInfo";
import { applyFileBatch } from "../../lib/file-index";
import { toFileUrl, toThumbnailUrl } from "../../lib/urls";
import type { MediaInfo, ServerFileEntry } from "../useFileServerSocket.types";

const UPDATE_FLUSH_MS = 100;

export const useFileServerSocket = (): MediaInfo[] => {
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

  return useMemo(() => {
    return Object.entries(record).map(
      ([name, { ar: aspectRatio, mt: modifiedTime, sz, t }]): MediaInfo => ({
        src: toFileUrl(location.origin, name, modifiedTime),
        thumbSrc: toThumbnailUrl(location.origin, name, modifiedTime),
        name,
        aspectRatio,
        discovery: t,
        mtime: modifiedTime,
        size: sz,
      }),
    );
  }, [record]);
};
