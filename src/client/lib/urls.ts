const DEFAULT_THUMBNAIL_WIDTH = 640;

export const toFileUrl = (
  origin: string,
  name: string,
  modifiedTime: number | undefined,
): string => {
  return `${origin}/files/${encodeURIComponent(name)}?t=${modifiedTime ?? 0}`;
};

export const toThumbnailUrl = (
  origin: string,
  name: string,
  modifiedTime: number | undefined,
  width = DEFAULT_THUMBNAIL_WIDTH,
): string => {
  return `${origin}/thumb?path=${encodeURIComponent(name)}&v=${
    modifiedTime ?? 0
  }&w=${width}`;
};
