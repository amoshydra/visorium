import { imageRegExp, videoRegExp } from "../../shared/file-extension";

export type MediaKind = "image" | "video" | "error";

export const getMediaKind = (name: string): MediaKind => {
  if (videoRegExp.test(name)) {
    return "video";
  }
  if (imageRegExp.test(name)) {
    return "image";
  }
  return "error";
};
