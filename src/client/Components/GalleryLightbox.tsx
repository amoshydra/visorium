import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";
import type { MediaInfo } from "../hooks/useFileServerSocket.types";
import { useViewportWidth } from "../hooks/useViewportWidth";
import {
  formatBytes,
  formatCount,
  formatDate,
  formatDimensions,
} from "../lib/format";
import { getMediaKind } from "../lib/media-kind";
import { toThumbnailUrl } from "../lib/urls";
import { MediaError } from "./MediaError";
import css from "./GalleryLightbox.module.css";

export interface GalleryLightboxProps {
  files: MediaInfo[];
  file: MediaInfo | null;
  onNavigate: (file: MediaInfo) => void;
  onClose: () => void;
}

const PREVIEW_WIDTH = 1600;
const MOBILE_PREVIEW_WIDTH = 1280;

export const GalleryLightbox = ({
  files,
  file,
  onNavigate,
  onClose,
}: GalleryLightboxProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pushedHistory = useRef(false);
  const viewportWidth = useViewportWidth();
  const previewWidth =
    viewportWidth <= 720 ? MOBILE_PREVIEW_WIDTH : PREVIEW_WIDTH;
  const isOpen = file !== null;
  const index = file
    ? files.findIndex((candidate) => candidate.name === file.name)
    : -1;

  const close = useCallback(() => {
    if (pushedHistory.current) {
      pushedHistory.current = false;
      history.back();
      return;
    }

    onClose();
  }, [onClose]);

  const navigate = useCallback(
    (offset: number) => {
      if (!file || files.length === 0) {
        return;
      }

      const current = index >= 0 ? index : 0;
      const next = files[(current + offset + files.length) % files.length];
      if (next) {
        onNavigate(next);
      }
    },
    [file, files, index, onNavigate],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      if (!pushedHistory.current) {
        const currentState =
          typeof history.state === "object" && history.state !== null
            ? history.state
            : {};
        history.pushState(
          { ...currentState, visoriumLightbox: true },
          "",
          window.location.href,
        );
        pushedHistory.current = true;
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      if (pushedHistory.current) {
        pushedHistory.current = false;
        history.back();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = () => {
      pushedHistory.current = false;
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, navigate]);

  useEffect(() => {
    if (!isOpen || index < 0 || files.length < 2) {
      return;
    }

    const next = files[(index + 1) % files.length];
    if (!next || getMediaKind(next.name) !== "image") {
      return;
    }

    const image = new Image();
    image.src = next.thumbSrc
      ? toThumbnailUrl(
          window.location.origin,
          next.name,
          next.mtime,
          previewWidth,
        )
      : next.src;
  }, [isOpen, index, files, previewWidth]);

  const position =
    index >= 0
      ? `${formatCount(index + 1)} / ${formatCount(files.length)}`
      : "";
  const basename = file?.name.split("/").pop() ?? "";

  return (
    <dialog
      ref={dialogRef}
      className={css.dialog}
      aria-label="Media preview"
      data-active={isOpen ? "true" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div
        className={css.backdrop}
        onClick={close}
        aria-hidden="true"
        data-active={isOpen ? "true" : undefined}
      />
      <div className={css.panel}>
        <header className={css.header}>
          <div className={css.heading}>
            <span className={css.title} title={file?.name}>
              {basename}
            </span>
            <span className={css.position}>{position}</span>
          </div>
          <button type="button" className={css.close} onClick={close}>
            Close
          </button>
        </header>

        {file && (
          <LightboxContent
            key={file.name}
            file={file}
            total={files.length}
            previewWidth={previewWidth}
            onNavigate={navigate}
            onClose={close}
          />
        )}
      </div>
    </dialog>
  );
};

interface LightboxContentProps {
  file: MediaInfo;
  total: number;
  previewWidth: number;
  onNavigate: (offset: number) => void;
  onClose: () => void;
}

const LightboxContent = ({
  file,
  total,
  previewWidth,
  onNavigate,
  onClose,
}: LightboxContentProps) => {
  const kind = getMediaKind(file.name);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const previewSrc = file.thumbSrc
    ? toThumbnailUrl(
        window.location.origin,
        file.name,
        file.mtime,
        previewWidth,
      )
    : file.src;
  const [imageSrc, setImageSrc] = useState(previewSrc);
  const [imageFailed, setImageFailed] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    setImageSrc(previewSrc);
    setImageFailed(false);
    setDimensions(null);
  }, [previewSrc]);

  const handleImageError = () => {
    if (imageSrc !== file.src) {
      setImageSrc(file.src);
      return;
    }

    setImageFailed(true);
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      touchStart.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;

    if (!start || event.changedTouches.length === 0) {
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      onNavigate(dx < 0 ? 1 : -1);
      return;
    }

    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
    }
  };

  return (
    <div className={css.content}>
      <div
        className={css.stage}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        {kind === "image" && !imageFailed && (
          <div className={css.imageStage}>
            {file.thumbSrc && (
              <img
                className={css.placeholder}
                src={file.thumbSrc}
                alt=""
                aria-hidden="true"
              />
            )}
            <img
              className={css.image}
              src={imageSrc}
              alt={file.name}
              onLoad={({ currentTarget }) => {
                setDimensions({
                  width: currentTarget.naturalWidth,
                  height: currentTarget.naturalHeight,
                });
              }}
              onError={handleImageError}
            />
          </div>
        )}

        {(kind === "error" || imageFailed) && (
          <div className={css.error}>
            <MediaError src={file.src} alt={file.name} />
          </div>
        )}

        {kind === "video" && (
          <video
            className={css.video}
            src={file.src}
            poster={file.posterSrc}
            controls
            autoPlay
            loop
            playsInline
            onLoadedMetadata={({ currentTarget }) => {
              setDimensions({
                width: currentTarget.videoWidth,
                height: currentTarget.videoHeight,
              });
            }}
          />
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              className={`${css.navButton} ${css.navPrev}`}
              aria-label="Previous file"
              onClick={() => onNavigate(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className={`${css.navButton} ${css.navNext}`}
              aria-label="Next file"
              onClick={() => onNavigate(1)}
            >
              ›
            </button>
          </>
        )}
      </div>

      <footer className={css.footer}>
        <span>{formatDimensions(dimensions?.width, dimensions?.height)}</span>
        <span>{formatBytes(file.size)}</span>
        <span>{formatDate(file.mtime)}</span>
        <a
          className={css.openOriginal}
          href={file.src}
          target="_blank"
          rel="noreferrer"
        >
          Open original
        </a>
      </footer>
    </div>
  );
};
