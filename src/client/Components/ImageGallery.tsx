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
import type { MediaInfo } from "../hooks/useFileServerSocket.types";
import { DENSITY_WIDTHS } from "../lib/gallery-state";
import { getFolderOptions, selectMedia } from "../lib/select-media";
import { GalleryLightbox } from "./GalleryLightbox";
import { GalleryToolbar } from "./GalleryToolbar";
import { ImageGalleryPlaceholder } from "./ImageGalleryPlaceholder";
import { Media } from "./Media";
import css from "./ImageGallery.module.css";

export function ImageGallery() {
  const files = useFileServerSocket();
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

      return <Media data={data} onOpen={openFile} />;
    },
    [openFile],
  );

  if (files.length === 0) {
    return <ImageGalleryPlaceholder />;
  }

  const columnWidth = DENSITY_WIDTHS[state.density];

  return (
    <>
      <GalleryToolbar
        state={state}
        totalCount={files.length}
        filteredCount={visibleFiles.length}
        folders={folders}
        onChange={updateState}
      />

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
    </>
  );
}
