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
import { SpatialLightboxViewer } from "./SpatialLightboxViewer";
import css from "./GalleryLightbox.module.css";

export interface GalleryLightboxProps {
  files: MediaInfo[];
  file: MediaInfo | null;
  spatialBase?: string | null;
  onNavigate: (file: MediaInfo) => void;
  onClose: () => void;
}

const isSpatialFile = (file: MediaInfo | null) => {
  if (!file) return false;
  const kind = getMediaKind(file.name);
  return kind === "model" || kind === "splat";
};

const PREVIEW_WIDTH = 1600;
const MOBILE_PREVIEW_WIDTH = 1280;

export const GalleryLightbox = ({
  files,
  file,
  spatialBase,
  onNavigate,
  onClose,
}: GalleryLightboxProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pushedHistory = useRef(false);
  const viewportWidth = useViewportWidth();
  const previewWidth =
    viewportWidth <= 900 ? MOBILE_PREVIEW_WIDTH : PREVIEW_WIDTH;
  const isOpen = file !== null;
  const fileKind = file ? getMediaKind(file.name) : null;
  const isSpatial = fileKind === "model" || fileKind === "splat";
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
      if (isSpatialFile(file)) {
        return;
      }

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
  }, [file, isOpen, navigate]);

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
            {isSpatial && (
              <span className={css.spatialBadge} aria-hidden="true">
                {fileKind === "model" ? "3D" : "SPLAT"}
              </span>
            )}
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
            spatialBase={spatialBase}
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
  spatialBase?: string | null;
  onNavigate: (offset: number) => void;
  onClose: () => void;
}

const LightboxContent = ({
  file,
  total,
  previewWidth,
  spatialBase,
  onNavigate,
  onClose,
}: LightboxContentProps) => {
  const kind = getMediaKind(file.name);
  const isSpatial = isSpatialFile(file);
  const extension = file.name.split(".").pop()?.toUpperCase();
  const spatialLabel = kind === "model" ? "3D model" : "Splat";
  const spatialMetadata = extension
    ? `${spatialLabel} · ${extension}`
    : spatialLabel;
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
  const fallbackAttempted = useRef(false);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  useEffect(() => {
    setImageSrc(previewSrc);
    setImageFailed(false);
    fallbackAttempted.current = false;
    setDimensions(null);

    if (kind !== "image") return;
    if (previewSrc === file.src) return;

    // Show the preview immediately, then upgrade to the original once it has
    // decoded. The 1600px preview is not enough for the enlarged lightbox on
    // large displays, but it keeps navigation instant while the full image
    // loads.
    let active = true;
    const fullImage = new Image();
    fullImage.decoding = "async";
    fullImage.onload = () => {
      if (active) {
        setImageSrc(file.src);
      }
    };
    fullImage.src = file.src;

    return () => {
      active = false;
      fullImage.onload = null;
    };
  }, [file.src, kind, previewSrc]);

  const handleImageError = () => {
    if (fallbackAttempted.current) {
      setImageFailed(true);
      return;
    }

    fallbackAttempted.current = true;
    if (imageSrc !== previewSrc) {
      setImageSrc(previewSrc);
      return;
    }
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
        className={`${css.stage} ${isSpatial ? css.spatialStage : ""}`}
        onTouchStart={isSpatial ? undefined : handleTouchStart}
        onTouchEnd={isSpatial ? undefined : handleTouchEnd}
        onTouchCancel={
          isSpatial
            ? undefined
            : () => {
                touchStart.current = null;
              }
        }
      >
        {isSpatial && spatialBase && (
          <SpatialLightboxViewer file={file} assetsBase={spatialBase} />
        )}

        {isSpatial && !spatialBase && (
          <div className={css.spatialMissing}>
            <p>3D support is not installed.</p>
            <code>npx -p visorium -p @visorium/spatial visorium</code>
          </div>
        )}

        {!isSpatial && kind === "image" && !imageFailed && (
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

        {!isSpatial && (kind === "error" || imageFailed) && (
          <div className={css.error}>
            <MediaError src={file.src} alt={file.name} />
          </div>
        )}

        {!isSpatial && kind === "video" && (
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
      </div>

      <footer className={css.footer}>
        <div className={css.footerMeta}>
          <span>
            {isSpatial
              ? spatialMetadata
              : formatDimensions(dimensions?.width, dimensions?.height)}
          </span>
          <span className={css.footerSize}>{formatBytes(file.size)}</span>
          <span className={css.footerDate}>{formatDate(file.mtime)}</span>
        </div>
        <div className={css.footerActions}>
          {total > 1 && (
            <div
              className={css.footerNav}
              role="group"
              aria-label="File navigation"
            >
              <button
                type="button"
                className={css.footerNavButton}
                aria-label="Previous file"
                onClick={() => onNavigate(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                className={css.footerNavButton}
                aria-label="Next file"
                onClick={() => onNavigate(1)}
              >
                ›
              </button>
            </div>
          )}
          {canShare && (
            <button
              type="button"
              className={css.shareButton}
              onClick={() => {
                void navigator
                  .share({ title: file.name, url: file.src })
                  .catch(() => {});
              }}
            >
              Share
            </button>
          )}
          <a
            className={css.openOriginal}
            href={file.src}
            target="_blank"
            rel="noreferrer"
          >
            Open original
          </a>
        </div>
      </footer>
    </div>
  );
};
