import { createXRStore } from "@react-three/xr";
import { createRoot } from "react-dom/client";
import { SpatialApp, type SpatialMedia } from "./App.js";

export const SPATIAL_CONTRACT_VERSION = 1;

export interface SpatialViewerOptions {
  container: HTMLElement;
  media: SpatialMedia[];
  activeIndex?: number;
  initialFocus?: boolean;
  onNavigate?: (index: number) => void;
  onClose?: () => void;
}

export interface SpatialViewerHandle {
  destroy(): void;
}

/**
 * Mount the optional spatial/VR viewer. The core package loads this module
 * lazily and passes its existing gallery data; this module never opens its own
 * socket.
 */
export function mountSpatialViewer(
  options: SpatialViewerOptions,
): SpatialViewerHandle {
  const store = createXRStore({ emulate: false });
  const root = createRoot(options.container);

  root.render(
    <SpatialApp
      media={options.media}
      activeIndex={options.activeIndex}
      initialFocus={options.initialFocus}
      onNavigate={options.onNavigate}
      onClose={options.onClose}
      store={store}
    />,
  );

  return {
    destroy() {
      root.unmount();
    },
  };
}
