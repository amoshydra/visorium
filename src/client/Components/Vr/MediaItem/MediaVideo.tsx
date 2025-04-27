import { Suspense, useEffect, useState } from "react";
import { DoubleSide, LinearFilter, SRGBColorSpace } from "three";
import { MediaMessage } from "../MediaMessage";
import { MediaComponent } from "./interface";

type AttachType = "map" | "emissiveMap";

export const MediaVideo: MediaComponent = ({ file, ...props }) => {
  return (
    <Suspense fallback={<MediaMessage message="Loading..." />}>
      <InternalMediaVideo file={file} {...props} />
    </Suspense>
  );
};

const InternalMediaVideo: MediaComponent = ({ file, ...props }) => {
  const [ratio, setRatio] = useState(file.aspectRatio ?? "1/1");
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  useEffect(() => {
    const video = document.createElement("video");
    video.src = file.src;
    video.loop = true;
    // video.muted = true;
    video.autoplay = true;
    video.addEventListener("loadedmetadata", ({ currentTarget }) => {
      const el = currentTarget as HTMLVideoElement;
      const width = el.videoWidth;
      const height = el.videoHeight;
      setRatio(`${width}/${height}`);
    });
    setVideoElement(video);

    return () => {
      video.pause();
      video.src = "";
      video.load();
      video.remove();
      setVideoElement(video);
    };
  }, [file.src]);

  const [w, h] = ratio.split("/");
  const r = parseInt(w, 10) / parseInt(h, 10);
  const ar = [r, 1] as const;

  return (
    <mesh {...props}>
      {videoElement && (
        <VideoScreen key={file.src} ratio={ar} video={videoElement} />
      )}
    </mesh>
  );
};

export interface VideoScreenProps {
  video: HTMLVideoElement | undefined;
  ratio: readonly [number, number];
}

export const VideoScreen = (props: VideoScreenProps) => {
  const { video: videoElement, ratio } = props;
  const [video, isPlaying] = useVideo(videoElement);
  return <VideoPlane video={video} isPlaying={isPlaying} ratio={ratio} />;
};

interface VideoPlaneProps {
  video: HTMLVideoElement | null | undefined;
  isPlaying: boolean;
  ratio: readonly [number, number];
}

const VideoPlane = (props: VideoPlaneProps) => {
  const { isPlaying, video, ratio } = props;
  return (
    <mesh>
      <planeGeometry args={ratio} />
      <meshStandardMaterial
        emissiveIntensity={isPlaying ? 1 : 0.5}
        emissive={isPlaying ? "white" : "maroon"}
        side={DoubleSide}
        metalness={1}
      >
        <VideoTextureMap video={video} attach="map" />
        <VideoTextureMap video={video} attach="emissiveMap" />
      </meshStandardMaterial>
    </mesh>
  );
};

interface VideoTextureMapProps {
  video: HTMLVideoElement | null | undefined;
  attach: AttachType;
}

const VideoTextureMap = ({ video, attach }: VideoTextureMapProps) => (
  <videoTexture
    attach={attach}
    args={video ? [video] : undefined}
    colorSpace={SRGBColorSpace}
    minFilter={LinearFilter}
    magFilter={LinearFilter}
    anisotropy={16}
  />
);
const useVideo = (video: HTMLVideoElement | undefined) => {
  const [isPlaying, setIsPlaying] = useState(computeIsPlaying(video));

  useEffect(() => {
    const handleEvent = (event: Event) => {
      const player = event.currentTarget as HTMLVideoElement;
      setIsPlaying(computeIsPlaying(player));
    };
    if (video) {
      events.forEach((event) => {
        video.addEventListener(event, handleEvent);
      });
    } else {
      setIsPlaying(false);
    }
    return () => {
      if (video) {
        events.forEach((event) => {
          video.removeEventListener(event, handleEvent);
        });
      }
    };
  }, [video]);

  return [video, isPlaying] as const;
};

const events = [
  "emptied", // called when OvenPlayer encountered a connection issue
  "play",
  "pause",
];

const computeIsPlaying = (video: HTMLVideoElement | undefined) => {
  if (!video) return false;
  if (video.paused) return false;
  if (!video.duration) return false;

  return true;
};
