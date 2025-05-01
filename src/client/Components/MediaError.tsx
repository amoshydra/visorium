import { ImgHTMLAttributes } from "react";
import ImagePlaceholderError from "../assets/placeholder-error.png";
import css from "./MediaError.module.css";

export interface MediaErrorProps extends ImgHTMLAttributes<HTMLImageElement> {
  active: boolean;
  aspectRatio?: string;
}

export const MediaError = ({
  active,
  src,
  aspectRatio,
  className,
  ...props
}: MediaErrorProps) => {
  return (
    <a
      href={src}
      className={[css.mediaError, css.mediaImage, className].join(" ")}
      target="_blank"
      style={{ aspectRatio }}
    >
      <img {...props} src={ImagePlaceholderError} />
    </a>
  );
};
