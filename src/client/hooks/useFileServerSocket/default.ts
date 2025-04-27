import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { FileEvent } from "../../../shared/events";
import type { FileInfo } from "../../../shared/FileInfo";
import type { MediaInfo, ServerFileEntry } from "../useFileServerSocket.types";

export const useFileServerSocket = (): MediaInfo[] => {
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
      ([newFile, fileInfo]: ServerFileEntry) => {
        setRecord((record) => {
          return {
            ...record,
            [newFile]: fileInfo,
          };
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

  const files = useMemo(() => {
    return Object.entries(record)
      .sort(([, { t: a }], [, { t: b }]) => a - b)
      .map(
        ([name, { ar: aspectRatio, mt: modifiedTime }]): MediaInfo => ({
          src: `${location.origin}/files/${encodeURIComponent(name)}?t=${modifiedTime}`,
          name,
          aspectRatio,
        }),
      );
  }, [record]);

  return files;
};
