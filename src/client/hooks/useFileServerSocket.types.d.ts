import type { FileEntry } from "../../../shared/FileInfo";

export interface MediaInfo {
  src: string;
  thumbSrc?: string;
  posterSrc?: string;
  name: string;
  aspectRatio: string | undefined;
  discovery?: number;
  mtime?: number;
  size?: number;
}

export type ServerFileEntry = FileEntry;

export type FileServerStatus =
  | "connecting"
  | "loading"
  | "reconnecting"
  | "ready"
  | "error";

export type FileServerStatusEvent =
  | "connect"
  | "pending"
  | "initial"
  | "disconnect"
  | "error"
  | "retry";

export interface UseFileServerSocketResult {
  files: MediaInfo[];
  status: FileServerStatus;
  retry: () => void;
}
