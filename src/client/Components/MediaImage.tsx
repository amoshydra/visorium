import { ImgHTMLAttributes, useState } from "react";
import { MediaError } from "./MediaError";
import css from "./MediaImage.module.css";

export interface MediaImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  active: boolean;
  aspectRatio?: string;
}

export const MediaImage = (props: MediaImageProps) => {
  return <ImageWithFallback loading="lazy" {...props} />;
};

const ImageWithFallback = ({
  active,
  src,
  alt,
  aspectRatio,
  ...props
}: MediaImageProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageRendering, setImageRendering] = useState<"auto" | "pixelated">(
    "auto",
  );
  return (
    <div className={css.mediaImage} style={{ aspectRatio }}>
      <img
        style={{ imageRendering, aspectRatio }}
        src={src}
        alt={alt}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        onLoad={({ currentTarget }) => {
          setImageRendering(
            currentTarget.clientWidth > currentTarget.naturalWidth
              ? "pixelated"
              : "auto",
          );
          setLoading(false);
        }}
        {...props}
      />
      {(loading || error) && (
        <MediaError
          active={active}
          src={src}
          alt={alt}
          aspectRatio={aspectRatio}
          className={css.mediaImageErrored}
          {...props}
        />
      )}
    </div>
  );
};
