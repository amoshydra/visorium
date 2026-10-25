import {
  imageRegExp,
  modelRegExp,
  splatRegExp,
  videoRegExp,
} from "../../shared/file-extension";

export type MediaKind = "image" | "video" | "model" | "splat" | "error";

export const getMediaKind = (name: string): MediaKind => {
  if (videoRegExp.test(name)) {
    return "video";
  }
  if (imageRegExp.test(name)) {
    return "image";
  }
  if (modelRegExp.test(name)) {
    return "model";
  }
  if (splatRegExp.test(name)) {
    return "splat";
  }
  return "error";
};
