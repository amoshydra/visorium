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
import { getGridMetrics } from "../lib/layout";
import { getFolderOptions, selectMedia } from "../lib/select-media";
import { GalleryLightbox } from "./GalleryLightbox";
import { GalleryStatus } from "./GalleryStatus";
import { GalleryToolbar } from "./GalleryToolbar";
import { Media } from "./Media";
import { ScrollToTop } from "./ScrollToTop";
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

  const openFile = useCallback((file: MediaInfo) => {
    setActiveFile(file);
  }, []);
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
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <p>Something went wrong:</p>
              <pre>{error.message}</pre>
              <button onClick={resetErrorBoundary}>Try again</button>
            </div>
          )}
        >
          <Masonry
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
        file={activeFile}
        onNavigate={setActiveFile}
        onClose={closeFile}
      />
      <ScrollToTop />
    </>
  );
}
