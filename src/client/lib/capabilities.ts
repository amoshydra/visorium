export interface SpatialCapability {
  assetsBase: string;
}

export const fetchSpatialCapability = async (
  signal?: AbortSignal,
): Promise<SpatialCapability | null> => {
  try {
    const response = await fetch("/api/capabilities", {
      credentials: "same-origin",
      signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      spatial?: unknown;
      assetsBase?: unknown;
    };
    if (data.spatial !== true || typeof data.assetsBase !== "string") {
      return null;
    }
    return { assetsBase: data.assetsBase };
  } catch {
    return null;
  }
};
