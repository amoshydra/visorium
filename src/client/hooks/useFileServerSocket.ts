import { useEffect, useMemo, useState } from "react";
import { FileEvent } from "../../shared/events";
import { produce } from "immer";
import { io } from "socket.io-client";

export const useFileServerSocket = () => {
  const [record, setRecord] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(window.location.origin);
    socketInstance.on(FileEvent.Initial, (initialFiles: string[]) => {
      const v = new Date().valueOf();
      const newRecord = Object.fromEntries(
        initialFiles.map((file) => [file, v]),
      );
      setRecord(newRecord);
    });
    socketInstance.on(FileEvent.Update, (newFile: string) => {
      setRecord((record) => {
        return produce(record, (draft) => {
          draft[newFile] = new Date().valueOf();
        });
      });
    });
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const files = useMemo(() => {
    return Object.entries(record).map(([name, time]) => ({
      src: `${location.origin}/files/${encodeURI(name)}?v=${time}`,
      name,
    }));
  }, [record]);

  return files;
};
