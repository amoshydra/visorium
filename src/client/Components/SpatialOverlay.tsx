import { useEffect, useRef, useState } from "react";
import type { MediaInfo } from "../hooks/useFileServerSocket.types";

interface SpatialMountOptions {
  container: HTMLElement;
  media: MediaInfo[];
  activeIndex: number;
  initialFocus: boolean;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

interface SpatialModule {
  mountSpatialViewer: (options: SpatialMountOptions) => {
    destroy: () => void;
  };
}

export interface SpatialOverlayProps {
  files: MediaInfo[];
  activeFile: MediaInfo | null;
  assetsBase: string;
  onNavigate: (file: MediaInfo) => void;
  onClose: () => void;
}

/**
 * Loads the optional spatial package from the server at runtime. No Three.js
 * code is part of the core gallery bundle.
 */
export const SpatialOverlay = ({
  files,
  activeFile,
  assetsBase,
  onNavigate,
  onClose,
}: SpatialOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ files, activeFile, onNavigate, onClose });
  const [error, setError] = useState<string | null>(null);
  latest.current = { files, activeFile, onNavigate, onClose };

  useEffect(() => {
    let cancelled = false;
    let handle: { destroy: () => void } | null = null;
    const container = containerRef.current;
    if (!container) return;

    const mount = async () => {
      try {
        const version = encodeURIComponent(String(Date.now()));
        const module = (await import(
          /* @vite-ignore */ `${assetsBase}index.js?v=${version}`
        )) as SpatialModule;
        if (cancelled) return;

        const current = latest.current;
        const activeIndex = current.activeFile
          ? Math.max(
              current.files.findIndex(
                (file) => file.name === current.activeFile?.name,
              ),
              0,
            )
          : 0;

        handle = module.mountSpatialViewer({
          container,
          media: current.files,
          activeIndex,
          initialFocus: current.activeFile != null,
          onNavigate: (index) => {
            const file = latest.current.files[index];
            if (file) latest.current.onNavigate(file);
          },
          onClose: () => latest.current.onClose(),
        });
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    };

    void mount();

    return () => {
      cancelled = true;
      handle?.destroy();
      container.innerHTML = "";
    };
  }, [assetsBase]);

  if (error) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#111",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h2>Spatial viewer could not start</h2>
          <p>{error}</p>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, zIndex: 1000 }}
      aria-label="3D and VR viewer"
    />
  );
};
