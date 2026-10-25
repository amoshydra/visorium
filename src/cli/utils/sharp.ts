import type { Metadata } from "sharp";
import { logger } from "./logger.js";

const getSharp = async () => {
  try {
    const { default: sharp } = await import("sharp");
    return sharp;
  } catch {
    logger.warnOnce(
      "sharp",
      "Optional sharp is unavailable; image metadata and thumbnail generation will use fallbacks.",
    );
    return () => ({
      metadata: (): Promise<Metadata> =>
        Promise.resolve({
          autoOrient: {
            height: 0,
            width: 0,
          },
        }),
    });
  }
};

export const sharp = await getSharp();
