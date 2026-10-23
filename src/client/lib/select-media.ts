import type { MediaInfo } from "../hooks/useFileServerSocket.types";
import {
  ROOT_FOLDER,
  type GalleryState,
} from "./gallery-state";
import { getMediaKind } from "./media-kind";

export interface FolderOption {
  value: string;
  label: string;
  count: number;
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const toPosixPath = (name: string) => name.replace(/\\/g, "/");

export const matchesFolder = (name: string, folder: string): boolean => {
  if (!folder) {
    return true;
  }

  const path = toPosixPath(name);
  if (folder === ROOT_FOLDER) {
    return !path.includes("/");
  }

  return path.startsWith(`${folder}/`);
};

export const getFolderOptions = (files: MediaInfo[]): FolderOption[] => {
  const counts = new Map<string, number>();
  let rootCount = 0;

  for (const file of files) {
    const parts = toPosixPath(file.name).split("/");
    if (parts.length === 1) {
      rootCount += 1;
      continue;
    }

    let prefix = "";
    for (let index = 0; index < parts.length - 1; index += 1) {
      prefix = prefix ? `${prefix}/${parts[index]}` : parts[index];
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
  }

  const options: FolderOption[] = [];
  if (rootCount > 0) {
    options.push({ value: ROOT_FOLDER, label: "(root)", count: rootCount });
  }
  for (const [value, count] of counts) {
    options.push({ value, label: value, count });
  }

  return options.sort((a, b) => collator.compare(a.label, b.label));
};

export const hasActiveFilters = (state: GalleryState): boolean => {
  return state.query.trim() !== "" || state.type !== "all" || !!state.folder;
};

export const selectMedia = (
  files: MediaInfo[],
  state: GalleryState,
): MediaInfo[] => {
  const query = state.query.trim().toLowerCase();
  const filtered = files.filter((file) => {
    if (query && !file.name.toLowerCase().includes(query)) {
      return false;
    }
    if (state.type !== "all" && getMediaKind(file.name) !== state.type) {
      return false;
    }
    return matchesFolder(file.name, state.folder);
  });

  const sorters: Record<
    GalleryState["sort"],
    (a: MediaInfo, b: MediaInfo) => number
  > = {
    discovery: (a, b) => (a.discovery ?? 0) - (b.discovery ?? 0),
    name: (a, b) => collator.compare(a.name, b.name),
    modified: (a, b) => (a.mtime ?? 0) - (b.mtime ?? 0),
    size: (a, b) => (a.size ?? 0) - (b.size ?? 0),
  };

  const direction = state.order === "asc" ? 1 : -1;

  return [...filtered].sort((a, b) => {
    const primary = sorters[state.sort](a, b);
    return primary !== 0 ? primary * direction : collator.compare(a.name, b.name);
  });
};
