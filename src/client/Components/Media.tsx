import type { MediaInfo } from "../hooks/useFileServerSocket.types";
import { getMediaKind } from "../lib/media-kind";
import css from "./Media.module.css";
import { MediaError } from "./MediaError";
import { MediaImage } from "./MediaImage";
import { MediaVideo } from "./MediaVideo";

export interface MediaProps {
  data: MediaInfo;
  onOpen: (file: MediaInfo) => void;
}

export const Media = ({ data, onOpen }: MediaProps) => {
  const { name, src, thumbSrc, aspectRatio } = data;
  const kind = getMediaKind(name);

  const media =
    kind === "video" ? (
      <MediaVideo
        active={false}
        aspectRatio={aspectRatio}
        src={src}
        alt={name}
      />
    ) : kind === "image" ? (
      <MediaImage
        active={false}
        aspectRatio={aspectRatio}
        src={src}
        thumbnailSrc={thumbSrc}
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
      </button>
    </figure>
  );
};

const Caption = ({ label }: { label: string }) => {
  return <figcaption className={css.label}>{label}</figcaption>;
};
