import { HTMLProps, ReactElement } from "react";
import { videoRegExp } from "../../shared/file-extension";
import css from "./Media.module.css";
import { MediaImage } from "./MediaImage";
import { MediaVideo } from "./MediaVideo";

interface MediaProp {
  src: string;
  name: string;
  aspectRatio: string | undefined;
}

export const Media = ({ src, name, aspectRatio }: MediaProp) => {
  if (videoRegExp.test(name)) {
    return (
      <MediaItem label={name} data-label={name}>
        <MediaVideo aspectRatio={aspectRatio} src={src} alt={name} />
      </MediaItem>
    );
  }

  return (
    <MediaItem label={name} data-label={name}>
      <MediaImage aspectRatio={aspectRatio} src={src} alt={name} />
    </MediaItem>
  );
};

interface MediaItemProps extends HTMLProps<HTMLElement> {
  label: string;
  children: ReactElement;
}
const MediaItem = ({ children, label, ...props }: MediaItemProps) => {
  return (
    <figure className={css.media} {...props}>
      <Caption label={label} />
      {children}
    </figure>
  );
};

const Caption = ({ label }: { label: string }) => {
  return <figcaption className={css.label}>{label}</figcaption>;
};
