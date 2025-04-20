import { produce } from "immer";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { FileEvent } from "../../shared/events";
import { FileInfo } from "../../shared/FileInfo";

export interface MediaInfo {
  src: string;
  name: string;
  aspectRatio: string | undefined;
}

export type ServerFileEntry = [path: string, info: FileInfo];

export const useFileServerSocket = (): MediaInfo[] => {
  const [record, setRecord] = useState<Record<string, FileInfo>>({});

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(window.location.origin);
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
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const files = useMemo(() => {
    return Object.entries(record)
      .map(
        ([name, { ar: aspectRatio }]): MediaInfo => ({
          src: `${location.origin}/files/${name
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/")}`,
          name,
          aspectRatio,
        }),
      )
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
  }, [record]);

  return files;
};
