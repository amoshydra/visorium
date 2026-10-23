import type { FileEntry } from "../../../shared/FileInfo";

export interface MediaInfo {
  src: string;
  thumbSrc?: string;
  posterSrc?: string;
  name: string;
  aspectRatio: string | undefined;
  mtime?: number;
  size?: number;
}

export type ServerFileEntry = FileEntry;
