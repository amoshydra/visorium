import { useEffect, useRef, useState } from "react";
import type { MediaInfo } from "../hooks/useFileServerSocket.types";

interface MountLightboxViewer {
  (options: {
    container: HTMLElement;
    media: MediaInfo;
    onError?: (message: string) => void;
  }): { destroy: () => void };
}

interface LightboxModule {
  mountLightboxViewer: MountLightboxViewer;
}

export interface SpatialLightboxViewerProps {
  file: MediaInfo;
  assetsBase: string;
}

/**
 * Flat-screen 3D lightbox. Only this component dynamically imports the
 * spatial lightbox entry; normal gallery users never load Three.js.
 */
export const SpatialLightboxViewer = ({
  file,
  assetsBase,
}: SpatialLightboxViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let handle: { destroy: () => void } | null = null;
    const container = containerRef.current;
    if (!container) return;

    setLoading(true);
    setError(null);

    const mount = async () => {
      try {
        const version = encodeURIComponent(String(Date.now()));
        const module = (await import(
          /* @vite-ignore */ `${assetsBase}lightbox.js?v=${version}`
        )) as LightboxModule;
        if (cancelled) return;

        handle = module.mountLightboxViewer({
          container,
          media: file,
          onError: (message) => {
            if (!cancelled) {
              setError(message);
              setLoading(false);
            }
          },
        });
        setLoading(false);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setLoading(false);
        }
      }
    };

    void mount();

    return () => {
      cancelled = true;
      handle?.destroy();
      container.innerHTML = "";
    };
  }, [assetsBase, attempt, file]);

  const retry = () => {
    setError(null);
    setLoading(true);
    setAttempt((current) => current + 1);
  };

  return (
    <div
      aria-busy={loading}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 240,
        background: "#0b0b0b",
        touchAction: "none",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {loading && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            display: "grid",
            placeItems: "center",
            color: "#bbb",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          Loading 3D…
        </div>
      )}
      {error && (
        <div
          role="alert"
          aria-atomic="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "grid",
            placeItems: "center",
            gap: 12,
            padding: 24,
            color: "#f5b5b5",
            background: "#0b0b0b",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, maxWidth: "42rem" }}>{error}</p>
          <button
            type="button"
            onClick={retry}
            style={{
              minHeight: 44,
              padding: "0 16px",
              borderRadius: 6,
              border: "1px solid #5a3a3a",
              background: "#241717",
              color: "#f5d0d0",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};
