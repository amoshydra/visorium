import { ReactElement } from "react";
import { videoRegExp } from "../../shared/file-extension";
import css from "./Media.module.css";
import { MediaImage } from "./MediaImage";

interface MediaProp {
  src: string;
  name: string;
  aspectRatio: string | undefined;
}

export const Media = ({ src, name, aspectRatio }: MediaProp) => {
  if (videoRegExp.test(name)) {
    return (
      <MediaItem label={name}>
        <video
          style={{ aspectRatio }}
          playsInline
          preload="metadata"
          loop
          autoPlay
          muted
          controls
          src={src}
        />
      </MediaItem>
    );
  }

  return (
    <MediaItem label={name}>
      <MediaImage aspectRatio={aspectRatio} src={src} alt={name} />
    </MediaItem>
  );
};

const MediaItem = ({
  children,
  label,
}: {
  label: string;
  children: ReactElement;
}) => {
  return (
    <figure className={css.media}>
      <Caption label={label} />
      {children}
    </figure>
  );
};

const Caption = ({ label }: { label: string }) => {
  return <figcaption className={css.label}>{label}</figcaption>;
};
