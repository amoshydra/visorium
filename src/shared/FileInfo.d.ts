export interface FileInfo {
  ar?: string;
  mt: number;
  sz?: number;
  t: number;
}

export type FileEntry = [path: string, info: FileInfo];
