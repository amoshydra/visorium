import { useState } from "react";
import { imageRegExp, videoRegExp } from "../../shared/file-extension";
import { LightBox } from "./LightBox";
import css from "./Media.module.css";
import { MediaError } from "./MediaError";
import { MediaImage } from "./MediaImage";
import { MediaVideo } from "./MediaVideo";

interface MediaProp {
  src: string;
  thumbnailSrc?: string;
  name: string;
  aspectRatio: string | undefined;
}

type MediaKind = "image" | "video" | "error";

export const Media = ({
  src,
  thumbnailSrc,
  name,
  aspectRatio,
}: MediaProp) => {
  const [isActive, setIsActive] = useState(false);
  const kind = getMediaKind(name);

  const media =
    kind === "video" ? (
      <MediaVideo
        active={isActive}
        aspectRatio={aspectRatio}
        src={src}
        alt={name}
      />
    ) : kind === "image" ? (
      <MediaImage
        active={isActive}
        aspectRatio={aspectRatio}
        src={src}
        thumbnailSrc={thumbnailSrc}
        alt={name}
      />
    ) : (
      <MediaError active={isActive} aspectRatio={aspectRatio} src={src} alt={name} />
    );

  return (
    <figure className={css.media}>
      <Caption label={name} />
      <LightBox
        active={isActive}
        onActiveChange={(active) => {
          setIsActive(active);
        }}
        aspectRatio={aspectRatio}
      >
        {media}
      </LightBox>
    </figure>
  );
};

const Caption = ({ label }: { label: string }) => {
  return <figcaption className={css.label}>{label}</figcaption>;
};

const getMediaKind = (name: string): MediaKind => {
  if (videoRegExp.test(name)) {
    return "video";
  }
  if (imageRegExp.test(name)) {
    return "image";
  }

  return "error";
};
