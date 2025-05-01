import { useCallback, useState, VideoHTMLAttributes } from "react";

export interface MediaVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  active: boolean;
  aspectRatio?: string;
  alt?: string;
}

export const MediaVideo = ({
  active,
  aspectRatio,
  ...props
}: MediaVideoProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const playThis = useCallback(
    ({ currentTarget }: { currentTarget: HTMLVideoElement }) => {
      if (active) return;
      document
        .querySelectorAll('video[data-is-playing="true"]')
        .forEach((e) => {
          (e as HTMLVideoElement).pause();
        });
      currentTarget.play();
      setIsPlaying(!currentTarget.paused);
    },
    [active],
  );

  return (
    <video
      data-is-playing={isPlaying}
      style={{ aspectRatio }}
      playsInline
      preload="metadata"
      loop
      controls={active}
      src={props.src}
      {...props}
      onMouseEnter={playThis}
      onMouseLeave={({ currentTarget }) => {
        if (active) return;
        currentTarget.pause();
      }}
    />
  );
};
