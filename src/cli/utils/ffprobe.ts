import { logger } from "./logger.js";

const getFfprobe = async () => {
  try {
    const { default: ffprobe } = await import("ffprobe-client");

    // The installer is intentionally not a dependency: its platform binaries
    // add tens of MB to every install. Use a system ffprobe or an explicitly
    // installed @ffprobe-installer/ffprobe.
    let ffprobePath: string | undefined;
    try {
      const moduleName = "@ffprobe-installer/ffprobe";
      const installer = (await import(moduleName)) as {
        default?: { path?: string };
      };
      ffprobePath = installer.default?.path;
    } catch {
      // ffprobe-client falls back to FFPROBE_PATH or "ffprobe" on PATH.
    }

    return async (path: string) => {
      return await ffprobe(path, ffprobePath ? { path: ffprobePath } : {});
    };
  } catch {
    logger.warnOnce(
      "ffprobe",
      "Optional ffprobe is unavailable; video aspect ratios will be skipped.",
    );
    return async () => {
      return Promise.resolve(null);
    };
  }
};

export const ffprobe = await getFfprobe();
