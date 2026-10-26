import { createRoot } from "react-dom/client";
import {
  LightboxApp,
  type LightboxMedia,
  type LightboxViewerOptions,
} from "./LightboxApp.js";

export const LIGHTBOX_CONTRACT_VERSION = 1;

export interface MountLightboxOptions extends LightboxViewerOptions {
  container: HTMLElement;
}

export interface LightboxViewerHandle {
  destroy(): void;
}

export type LightboxMediaInfo = LightboxMedia;

const roots = new WeakMap<HTMLElement, ReturnType<typeof createRoot>>();

export function mountLightboxViewer(
  options: MountLightboxOptions,
): LightboxViewerHandle {
  const previous = roots.get(options.container);
  previous?.unmount();

  const root = createRoot(options.container);
  roots.set(options.container, root);
  root.render(
    <LightboxApp
      media={options.media}
      onError={options.onError}
      onReady={() => {}}
    />,
  );

  return {
    destroy() {
      root.unmount();
      roots.delete(options.container);
    },
  };
}
