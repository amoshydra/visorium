import { produce } from "immer";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { FileEvent } from "../../../shared/events";
import type { FileInfo } from "../../../shared/FileInfo";
import type { MediaInfo, ServerFileEntry } from "../useFileServerSocket.types";

const params = new URLSearchParams(window.location.search);
const defaultSearch = params.get("search") || "";
const defaultOrder = params.get("order") === "desc" ? "desc" : "asc";

export const useFileServerSocket = (
  search = defaultSearch,
  order = defaultOrder,
): MediaInfo[] => {
  const [record, setRecord] = useState<Record<string, FileInfo>>({});

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(window.location.origin);
    socketInstance.on(FileEvent.Pending, () => {
      setRecord({});
    });
    socketInstance.on(FileEvent.Initial, (initialFiles: ServerFileEntry[]) => {
      const newRecord = Object.fromEntries(
        initialFiles.map(([path, v]) => [path, v]),
      );
      setRecord(newRecord);
    });
    socketInstance.on(
      FileEvent.Update,
      ([newFile, lastModified]: ServerFileEntry) => {
        setRecord((record) => {
          return produce(record, (draft) => {
            draft[newFile] = lastModified;
          });
        });
      },
    );
    socketInstance.on(FileEvent.Delete, (newFile: string) => {
      setRecord((record) => {
        const temp = { ...record };
        delete temp[newFile];
        return temp;
      });
    });
    return () => {
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
        ([name, { ar: aspectRatio, mt: modifiedTime }]): MediaInfo => ({
          src: `${location.origin}/files/${encodeURIComponent(name)}?t=${modifiedTime}`,
          name,
          aspectRatio,
        }),
      );
  }, [record, order, deferredSearch]);

  return files;
};
