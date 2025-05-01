import { Metadata } from "sharp";

const getSharp = async () => {
  try {
    const { default: sharp } = await import("sharp");
    return sharp;
  } catch (e) {
    console.log(e);
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
