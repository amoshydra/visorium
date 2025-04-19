import { ImgHTMLAttributes, useState } from "react";
import ImagePlaceholderError from "../assets/placeholder-error.png";
import css from "./MediaImage.module.css";

export interface MediaImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: string;
}

export const MediaImage = (props: MediaImageProps) => {
  return <ImageWithFallback loading="lazy" {...props} />;
};

const ImageWithFallback = ({
  src,
  alt,
  aspectRatio,
  ...props
}: MediaImageProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <div className={css.mediaImage} style={{ aspectRatio }}>
      <img
        src={src}
        alt={alt}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        onLoad={() => {
          setLoading(false);
        }}
        {...props}
      />
      {(loading || error) && (
        <a href={src} className={css.mediaImageErrored} target="_blank">
          <img src={error ? ImagePlaceholderError : ImagePlaceholderError} />
        </a>
      )}
    </div>
  );
};
