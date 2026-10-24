import type { MediaInfo } from "../hooks/useFileServerSocket.types";
import { getMediaKind } from "../lib/media-kind";
import { toThumbnailUrl } from "../lib/urls";
import css from "./Media.module.css";
import { MediaError } from "./MediaError";
import { MediaImage } from "./MediaImage";
import { MediaVideo } from "./MediaVideo";

export interface MediaProps {
  data: MediaInfo;
  columnWidth: number;
  onOpen: (file: MediaInfo) => void;
}

export const Media = ({ data, columnWidth, onOpen }: MediaProps) => {
  const { name, src, thumbSrc, aspectRatio, mtime } = data;
  const kind = getMediaKind(name);
  const thumbnailSrcSet = thumbSrc
    ? [320, 640, 960, 1280]
        .map(
          (width) =>
            `${toThumbnailUrl(window.location.origin, name, mtime, width)} ${width}w`,
        )
        .join(", ")
    : undefined;

  const media =
    kind === "video" ? (
      <MediaVideo
        active={false}
        aspectRatio={aspectRatio}
        src={src}
        poster={data.posterSrc}
        alt={name}
      />
    ) : kind === "image" ? (
      <MediaImage
        active={false}
        aspectRatio={aspectRatio}
        src={src}
        thumbnailSrc={thumbSrc}
        srcSet={thumbnailSrcSet}
        sizes={`${Math.ceil(columnWidth)}px`}
        alt={name}
      />
    ) : (
      <MediaError
        link={false}
        aspectRatio={aspectRatio}
        src={src}
        alt={name}
      />
    );

  return (
    <figure className={css.media}>
      <Caption label={name} />
      <button
        type="button"
        className={css.tileButton}
        style={{ aspectRatio }}
        aria-label={`Open ${name}`}
        onClick={() => onOpen(data)}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpen(data);
        }}
      >
        {media}
        {kind === "video" && (
          <span className={css.videoBadge} aria-hidden="true">
            ▶
          </span>
        )}
      </button>
    </figure>
  );
};

const Caption = ({ label }: { label: string }) => {
  return <figcaption className={css.label}>{label}</figcaption>;
};
