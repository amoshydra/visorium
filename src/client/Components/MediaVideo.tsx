import { VideoHTMLAttributes } from "react";

export interface MediaVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  aspectRatio?: string;
  alt?: string;
}

export const MediaVideo = ({ aspectRatio, ...props }: MediaVideoProps) => {
  const params = new URLSearchParams(window.location.search);
  const autoPlay = params.get("autoplay") === "true";
  const muted = params.get("muted") === "true";
  return (
    <video
      style={{ aspectRatio }}
      playsInline
      preload="metadata"
      loop
      muted={muted}
      autoPlay={autoPlay}
      controls
      src={props.src}
      onMouseEnter={({ currentTarget }) => {
        document.querySelectorAll("video").forEach((element) => {
          if (autoPlay) {
            element.muted = true;
          } else {
            element.pause();
          }
        });
        if (currentTarget.paused) {
          currentTarget.play();
          return;
        } else {
          currentTarget.muted = false;
        }
      }}
      {...props}
    />
  );
};
