import { useMemo, useState } from "react";
import { imageRegExp, videoRegExp } from "../../shared/file-extension";
import { LightBox } from "./LightBox";
import css from "./Media.module.css";
import { MediaError } from "./MediaError";
import { MediaImage } from "./MediaImage";
import { MediaVideo } from "./MediaVideo";

interface MediaProp {
  src: string;
  name: string;
  aspectRatio: string | undefined;
}

export const Media = ({ src, name, aspectRatio }: MediaProp) => {
  const [isActive, setIsActive] = useState(false);

  const MediaComponent = useMemo(() => getMediaComponent(name), [name]);

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
        <MediaComponent
          active={isActive}
          aspectRatio={aspectRatio}
          src={src}
          alt={name}
        />
      </LightBox>
    </figure>
  );
};

const Caption = ({ label }: { label: string }) => {
  return <figcaption className={css.label}>{label}</figcaption>;
};

const getMediaComponent = (name: string) => {
  if (videoRegExp.test(name)) {
    return MediaVideo;
  }
  if (imageRegExp.test(name)) {
    return MediaImage;
  }

  return MediaError;
};
