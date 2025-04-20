import { FileInfo } from "../../../shared/FileInfo";

export interface MediaInfo {
  src: string;
  name: string;
  aspectRatio: string | undefined;
}

export type ServerFileEntry = [path: string, info: FileInfo];
