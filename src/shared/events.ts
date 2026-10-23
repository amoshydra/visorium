import type { FileEntry } from "./FileInfo.js";

export interface FileBatch {
  set: FileEntry[];
  delete: string[];
}

export const FileEvent = {
  Initial: "f:i",
  Pending: "f:p",
  Update: "f:u",
  Delete: "f:d",
  Error: "f:e",
};
