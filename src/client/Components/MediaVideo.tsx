import { useCallback, useState, VideoHTMLAttributes } from "react";

export interface MediaVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  aspectRatio?: string;
  alt?: string;
}

export const MediaVideo = ({ aspectRatio, ...props }: MediaVideoProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const playThis = useCallback(
    ({ currentTarget }: { currentTarget: HTMLVideoElement }) => {
      document
        .querySelectorAll('video[data-is-playing="true"]')
        .forEach((e) => {
          (e as HTMLVideoElement).pause();
        });
      currentTarget.play();
      setIsPlaying(!currentTarget.paused);
    },
    [],
  );

  return (
    <video
      data-is-playing={isPlaying}
      style={{ aspectRatio }}
      playsInline
      preload="metadata"
      loop
      controls
      src={props.src}
      {...props}
      onMouseEnter={playThis}
    />
  );
};
