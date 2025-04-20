import { imageRegExp, videoRegExp } from "./file-extension";

const contentTypeMap = new Map([
  // Video formats
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
  ["mov", "video/quicktime"],
  ["mkv", "video/x-matroska"],
  ["avi", "video/x-msvideo"],
  ["flv", "video/x-flv"],
  ["wmv", "video/x-ms-wmv"],
  ["m4v", "video/x-m4v"],
  ["3gp", "video/3gpp"],
  ["3g2", "video/3gpp2"],
  ["ts", "video/mp2t"],
  ["mts", "video/MP2T"],
  ["m2ts", "video/MP2T"],
  ["vob", "video/dvd"],
  ["ogv", "video/ogg"],
  ["mxf", "application/mxf"],
  ["f4v", "video/x-f4v"],
  ["asf", "video/x-ms-asf"],
  ["m2v", "video/mpeg"],
  ["mpg", "video/mpeg"],
  ["mpeg", "video/mpeg"],
  ["dvr-ms", "video/x-ms-dvr"],
  ["wtv", "video/x-ms-wtv"],

  // Image formats (commonly associated with media)
  ["apng", "image/apng"],
  ["avif", "image/avif"],
  ["gif", "image/gif"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["svg", "image/svg+xml"],
  ["webp", "image/webp"],
  ["bmp", "image/bmp"],
  ["tiff", "image/tiff"],
  ["tif", "image/tiff"],
]);

export const getMimeType = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const contentType = contentTypeMap.get(ext);
  if (contentType) return contentType;

  if (videoRegExp.test(path)) return "video/*";
  if (imageRegExp.test(path)) return "image/*";

  return null;
};
