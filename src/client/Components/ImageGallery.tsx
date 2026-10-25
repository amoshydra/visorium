import { Masonry, RenderComponentProps } from "masonic";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useFileServerSocket } from "../hooks/useFileServerSocket";
import { useGalleryState } from "../hooks/useGalleryState";
import { useViewportWidth } from "../hooks/useViewportWidth";
import type { MediaInfo } from "../hooks/useFileServerSocket.types";
import { fetchSpatialCapability } from "../lib/capabilities";
import { getGridMetrics } from "../lib/layout";
import { getMediaKind } from "../lib/media-kind";
import { getFolderOptions, selectMedia } from "../lib/select-media";
import { GalleryLightbox } from "./GalleryLightbox";
import { GalleryStatus } from "./GalleryStatus";
import { GalleryToolbar } from "./GalleryToolbar";
import { Media } from "./Media";
import { ScrollToTop } from "./ScrollToTop";
import { SpatialInstallPrompt } from "./SpatialInstallPrompt";
import { SpatialOverlay } from "./SpatialOverlay";
import css from "./ImageGallery.module.css";

export function ImageGallery() {
  const { files, status, retry } = useFileServerSocket();
  const [state, updateState] = useGalleryState();
  const deferredQuery = useDeferredValue(state.query);
  const viewState = useMemo(
    () => ({ ...state, query: deferredQuery }),
    [state, deferredQuery],
  );
  const folders = useMemo(() => getFolderOptions(files), [files]);
  const visibleFiles = useMemo(
    () => selectMedia(files, viewState),
    [files, viewState],
  );
  const [activeFile, setActiveFile] = useState<MediaInfo | null>(null);
  const [spatialBase, setSpatialBase] = useState<string | null>(null);
  const [spatialOpen, setSpatialOpen] = useState(false);
  const [installPromptOpen, setInstallPromptOpen] = useState(false);
  const [capabilityChecked, setCapabilityChecked] = useState(false);
  const [vrRequested] = useState(
    () => new URLSearchParams(window.location.search).get("view") === "vr",
  );
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth <= 900;
  const { columnWidth } = getGridMetrics(
    viewportWidth,
    state.density,
    isMobile,
  );

  useEffect(() => {
    if (activeFile && !files.some((file) => file.name === activeFile.name)) {
      setActiveFile(null);
    }
  }, [activeFile, files]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchSpatialCapability(controller.signal)
      .then((capability) => {
        if (capability) setSpatialBase(capability.assetsBase);
      })
      .finally(() => setCapabilityChecked(true));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (vrRequested && spatialBase && files.length > 0) {
      setSpatialOpen(true);
    }
  }, [files.length, spatialBase, vrRequested]);

  useEffect(() => {
    if (vrRequested && capabilityChecked && !spatialBase) {
      setInstallPromptOpen(true);
    }
  }, [capabilityChecked, spatialBase, vrRequested]);

  const openFile = useCallback(
    (file: MediaInfo) => {
      const kind = getMediaKind(file.name);
      if (kind === "model" || kind === "splat") {
        if (spatialBase) {
          setActiveFile(file);
          setSpatialOpen(true);
        } else {
          setInstallPromptOpen(true);
        }
        return;
      }
      setActiveFile(file);
    },
    [spatialBase],
  );
  const closeFile = useCallback(() => {
    setActiveFile(null);
  }, []);

  const renderCard = useCallback(
    ({ data }: RenderComponentProps<MediaInfo>) => {
      if (!data) {
        return <></>;
      }

      return <Media data={data} onOpen={openFile} columnWidth={columnWidth} />;
    },
    [openFile, columnWidth],
  );

  const masonryKey = JSON.stringify([
    deferredQuery,
    state.type,
    state.folder,
    state.sort,
    state.order,
    state.density,
  ]);

  if (files.length === 0) {
    if (status === "error") {
      return (
        <GalleryStatus
          variant="error"
          title="Can't connect to Visorium"
          message="The server may still be starting. Check the terminal, then retry."
          actionLabel="Retry"
          onAction={retry}
        />
      );
    }

    if (status === "ready") {
      return (
        <GalleryStatus
          variant="empty"
          title="No images or videos found"
          message="No media files are available in this folder yet. New files will appear automatically."
        />
      );
    }

    return (
      <GalleryStatus
        variant="loading"
        title={
          status === "connecting"
            ? "Connecting to Visorium…"
            : status === "reconnecting"
              ? "Reconnecting…"
              : "Scanning folder…"
        }
        message={
          status === "connecting"
            ? "Waiting for the media server."
            : status === "reconnecting"
              ? "The connection was lost. Trying again…"
              : "Building the media index. Large folders can take a moment."
        }
      />
    );
  }

  return (
    <>
      <GalleryToolbar
        state={state}
        totalCount={files.length}
        filteredCount={visibleFiles.length}
        folders={folders}
        onChange={updateState}
      />

      {spatialBase && (
        <button
          type="button"
          onClick={() => setSpatialOpen(true)}
          style={{
            position: "fixed",
            right: 16,
            bottom: 72,
            zIndex: 20,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.24)",
            background: "#202020",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Open 3D / VR
        </button>
      )}

      {status !== "ready" && (
        <div className={css.banner} role="status">
          <span>
            {status === "error"
              ? "Disconnected — showing the last loaded files."
              : status === "reconnecting"
                ? "Reconnecting…"
                : "Scanning folder…"}
          </span>
          {status === "error" && (
            <button type="button" onClick={retry}>
              Retry
            </button>
          )}
        </div>
      )}

      {visibleFiles.length === 0 ? (
        <div className={css.noMatches}>
          No files match the current search or filters.
        </div>
      ) : (
        <ErrorBoundary
          resetKeys={[masonryKey]}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <p>Something went wrong:</p>
              <pre>{error.message}</pre>
              <button onClick={resetErrorBoundary}>Try again</button>
            </div>
          )}
        >
          <Masonry
            key={masonryKey}
            columnWidth={columnWidth}
            itemHeightEstimate={Math.round(columnWidth * 0.75)}
            items={visibleFiles}
            itemKey={(data, index) => data?.name ?? index}
            render={renderCard}
          />
        </ErrorBoundary>
      )}

      <GalleryLightbox
        files={visibleFiles}
        file={spatialOpen ? null : activeFile}
        onNavigate={setActiveFile}
        onClose={closeFile}
      />
      {spatialOpen && spatialBase && (
        <SpatialOverlay
          files={visibleFiles}
          activeFile={activeFile}
          assetsBase={spatialBase}
          onNavigate={setActiveFile}
          onClose={() => {
            setSpatialOpen(false);
            setActiveFile(null);
          }}
        />
      )}
      {installPromptOpen && (
        <SpatialInstallPrompt onClose={() => setInstallPromptOpen(false)} />
      )}
      <ScrollToTop />
    </>
  );
}
