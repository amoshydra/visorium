const getFfprobe = async () => {
  try {
    const { default: ffprobeInstallerFfprobe } = await import(
      "@ffprobe-installer/ffprobe"
    );
    const { default: ffprobe } = await import("ffprobe-client");

    return async (path: string) => {
      return await ffprobe(path, {
        path: ffprobeInstallerFfprobe.path,
      });
    };
  } catch (error) {
    console.error("Error initializing ffprobe:", error);
    return async () => {
      return Promise.resolve(null);
    };
  }
};

export const ffprobe = await getFfprobe();
