export const SPATIAL_CONTRACT_VERSION = 1;

export interface SpatialViewerOptions {
  container: HTMLElement;
  media: unknown[];
  activeIndex?: number;
  onNavigate?: (index: number) => void;
  onClose?: () => void;
}

export interface SpatialViewerHandle {
  destroy(): void;
}

/**
 * Mount the optional spatial/VR viewer.
 *
 * This is the contract boundary between the core package and the optional
 * spatial package. The implementation will be added in the spatial viewer
 * phase; the core package never imports this module directly.
 */
export function mountSpatialViewer(
  options: SpatialViewerOptions,
): SpatialViewerHandle {
  void options;
  throw new Error("@visorium/spatial is not implemented yet");
}
