export const imageExtensions = [
  "bmp",
  "gif",
  "jpg",
  "jpeg",
  "png",
  "tiff",
  "tif",
  "webp",
  "heic",
  "heif",
  "ico",
  "svg",
  "dds",
  "raw",
];
export const videoExtensions = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "flv",
  "wmv",
  "webm",
  "3gp",
  "3g2",
];

export const modelExtensions = ["glb", "gltf"];
export const splatExtensions = ["splat", "ksplat", "spz", "ply", "sogs"];

const toPattern = (extensions: string[]) => {
  return new RegExp(`\\.(${extensions.join("|")})$`, "i");
};

export const imageRegExp = toPattern(imageExtensions);
export const videoRegExp = toPattern(videoExtensions);
export const modelRegExp = toPattern(modelExtensions);
export const splatRegExp = toPattern(splatExtensions);
export const mediaRegExp = toPattern([
  ...imageExtensions,
  ...videoExtensions,
  ...modelExtensions,
  ...splatExtensions,
]);
