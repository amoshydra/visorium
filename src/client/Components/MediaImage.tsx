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
  const [imageRendering, setImageRendering] = useState<"auto" | "pixelated">(
    "auto",
  );
  return (
    <div className={css.mediaImage} style={{ aspectRatio }}>
      <img
        style={{ imageRendering }}
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
        <a href={src} className={css.mediaImageErrored} target="_blank">
          <img src={error ? ImagePlaceholderError : ImagePlaceholderError} />
        </a>
      )}
    </div>
  );
};
