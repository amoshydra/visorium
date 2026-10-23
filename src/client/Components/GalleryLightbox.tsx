import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaInfo } from "../hooks/useFileServerSocket.types";
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

export const GalleryLightbox = ({
  files,
  file,
  onNavigate,
  onClose,
}: GalleryLightboxProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pushedHistory = useRef(false);
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
      ? toThumbnailUrl(window.location.origin, next.name, next.mtime, PREVIEW_WIDTH)
      : next.src;
  }, [isOpen, index, files]);

  const position =
    index >= 0
      ? `${formatCount(index + 1)} / ${formatCount(files.length)}`
      : "";

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
              {file?.name ?? ""}
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
            index={index}
            total={files.length}
            onNavigate={navigate}
          />
        )}
      </div>
    </dialog>
  );
};

interface LightboxContentProps {
  file: MediaInfo;
  index: number;
  total: number;
  onNavigate: (offset: number) => void;
}

const LightboxContent = ({
  file,
  index,
  total,
  onNavigate,
}: LightboxContentProps) => {
  const kind = getMediaKind(file.name);
  const previewSrc = file.thumbSrc
    ? toThumbnailUrl(
        window.location.origin,
        file.name,
        file.mtime,
        PREVIEW_WIDTH,
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

  return (
    <div className={css.content}>
      <div className={css.stage}>
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
        <span className={css.footerPosition}>
          {index >= 0 ? `${formatCount(index + 1)} / ${formatCount(total)}` : ""}
        </span>
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
