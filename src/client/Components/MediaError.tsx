import { ImgHTMLAttributes } from "react";
import ImagePlaceholderError from "../assets/placeholder-error.png";
import mediaImageCss from "./MediaImage.module.css";
import css from "./MediaError.module.css";

export interface MediaErrorProps extends ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: string;
  link?: boolean;
}

export const MediaError = ({
  link = true,
  src,
  aspectRatio,
  className,
  ...props
}: MediaErrorProps) => {
  const classes = [css.mediaError, mediaImageCss.mediaImage, className]
    .filter(Boolean)
    .join(" ");
  const content = <img {...props} src={ImagePlaceholderError} />;

  if (!link) {
    return (
      <div className={classes} style={{ aspectRatio }}>
        {content}
      </div>
    );
  }

  return (
    <a
      href={src}
      className={classes}
      target="_blank"
      rel="noreferrer"
      style={{ aspectRatio }}
    >
      {content}
    </a>
  );
};
