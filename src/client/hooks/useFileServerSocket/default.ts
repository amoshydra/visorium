import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { FileEvent, type FileBatch } from "../../../shared/events";
import { videoRegExp } from "../../../shared/file-extension";
import type { FileInfo } from "../../../shared/FileInfo";
import { applyFileBatch } from "../../lib/file-index";
import { nextFileServerStatus } from "../../lib/server-status";
import { toFileUrl, toPosterUrl, toThumbnailUrl } from "../../lib/urls";
import type {
  FileServerStatus,
  FileServerStatusEvent,
  MediaInfo,
  ServerFileEntry,
  UseFileServerSocketResult,
} from "../useFileServerSocket.types";

const UPDATE_FLUSH_MS = 100;

export const useFileServerSocket = (): UseFileServerSocketResult => {
  const [record, setRecord] = useState<Record<string, FileInfo>>({});
  const [status, setStatus] = useState<FileServerStatus>("connecting");
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const retry = useCallback(() => {
    setStatus((current) => nextFileServerStatus(current, "retry"));
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();
  }, []);

  useEffect(() => {
    const socketInstance = io(window.location.origin);
    socketRef.current = socketInstance;

    const updateStatus = (event: FileServerStatusEvent) => {
      setStatus((current) => nextFileServerStatus(current, event));
    };

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

    socketInstance.on("connect", () => updateStatus("connect"));
    socketInstance.on("disconnect", () => updateStatus("disconnect"));
    socketInstance.on("connect_error", () => updateStatus("error"));
    socketInstance.on(FileEvent.Error, () => updateStatus("error"));

    socketInstance.on(FileEvent.Pending, () => {
      cancelFlush();
      clearPending();
      updateStatus("pending");
    });
    socketInstance.on(FileEvent.Initial, (initialFiles: ServerFileEntry[]) => {
      cancelFlush();
      clearPending();
      setRecord(Object.fromEntries(initialFiles));
      updateStatus("initial");
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
      if (socketRef.current === socketInstance) {
        socketRef.current = null;
      }
    };
  }, []);

  const files = useMemo(() => {
    return Object.entries(record).map(
      ([name, { ar: aspectRatio, mt: modifiedTime, sz, t }]): MediaInfo => ({
        src: toFileUrl(location.origin, name, modifiedTime),
        thumbSrc: toThumbnailUrl(location.origin, name, modifiedTime),
        posterSrc: videoRegExp.test(name)
          ? toPosterUrl(location.origin, name, modifiedTime)
          : undefined,
        name,
        aspectRatio,
        discovery: t,
        mtime: modifiedTime,
        size: sz,
      }),
    );
  }, [record]);

  return { files, status, retry };
};
