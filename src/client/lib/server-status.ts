import type {
  FileServerStatus,
  FileServerStatusEvent,
} from "../hooks/useFileServerSocket.types";

export const nextFileServerStatus = (
  current: FileServerStatus,
  event: FileServerStatusEvent,
): FileServerStatus => {
  switch (event) {
    case "initial":
      return "ready";
    case "error":
      return "error";
    case "retry":
      return "connecting";
    case "pending":
    case "connect":
      return "loading";
    case "disconnect":
      return current === "connecting" ? "connecting" : "reconnecting";
    default:
      return current;
  }
};
