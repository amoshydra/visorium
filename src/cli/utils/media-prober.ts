import sharp from "sharp";
import { imageRegExp, videoRegExp } from "../../shared/file-extension.js";
import { ffprobe } from "./ffprobe.js";

type AspectRatio = `${number}/${number}`;

export const probeAspectRatio = async (
  path: string,
): Promise<AspectRatio | undefined> => {
  try {
    if (videoRegExp.test(path)) {
      return await probeVideoAspectRadio(path);
    }
    if (imageRegExp.test(path)) {
      return await probeImageAspectRadio(path);
    }
    return undefined;
  } catch (e) {
    console.error("Error probing aspect ratio:", e);
    return undefined;
  }
};

const probeVideoAspectRadio = async (
  path: string,
): Promise<AspectRatio | undefined> => {
  const probed = await ffprobe(path);
  const { display_aspect_ratio } = probed?.streams.find(
    (stream) => stream.codec_type === "video",
  ) || { display_aspect_ratio: undefined };
  return display_aspect_ratio?.replace(":", "/") as AspectRatio | undefined;
};

const probeImageAspectRadio = async (
  path: string,
): Promise<AspectRatio | undefined> => {
  const metadata = await sharp(path).metadata();
  if (metadata.width == undefined || metadata.height == undefined)
    return undefined;

  return getAspectRatio(metadata.width, metadata.height);
};

const getAspectRatio = (width: number, height: number) => {
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };
  const divisor = gcd(width, height);
  return `${width / divisor}/${height / divisor}` as AspectRatio;
};
