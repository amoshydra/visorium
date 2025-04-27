import { Suspense, useEffect, useState } from "react";
import { DoubleSide, LinearFilter, SRGBColorSpace } from "three";
import { MediaMessage } from "../MediaMessage";
import { MediaComponent } from "./interface";
import { useWebXrLayerCompat } from "./useWebXrLayerCompat";

export const MediaVideoStereo: MediaComponent = ({ file, ...props }) => {
  return (
    <Suspense fallback={<MediaMessage message="Loading..." />}>
      <InternalMediaVideoStereo file={file} {...props} />
    </Suspense>
  );
};

const InternalMediaVideoStereo: MediaComponent = ({ file, ...props }) => {
  useWebXrLayerCompat();
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
  video: HTMLVideoElement;
  ratio: readonly [number, number];
}

export const VideoScreen = (props: VideoScreenProps) => {
  const { video: videoElement, ratio } = props;
  const [video, isPlaying] = useVideo(videoElement);
  return <VideoPlane video={video} isPlaying={isPlaying} ratio={ratio} />;
};

interface VideoPlaneProps {
  video: HTMLVideoElement;
  isPlaying: boolean;
  ratio: readonly [number, number];
}

const VideoPlane = (props: VideoPlaneProps) => {
  const { video, ratio } = props;
  const r = [ratio[0] / 2, 1] as const;
  return (
    <group>
      <mesh layers={[1]}>
        <planeGeometry args={r} />
        <meshBasicMaterial side={DoubleSide}>
          <videoTexture
            attach="map"
            args={[video]}
            colorSpace={SRGBColorSpace}
            minFilter={LinearFilter}
            magFilter={LinearFilter}
            anisotropy={16}
            offset={[0, 0]}
            repeat={[0.5, 1]}
          />
        </meshBasicMaterial>
      </mesh>
      <mesh layers={[2]}>
        <planeGeometry args={r} />
        <meshBasicMaterial side={DoubleSide}>
          <videoTexture
            attach="map"
            args={[video]}
            colorSpace={SRGBColorSpace}
            minFilter={LinearFilter}
            magFilter={LinearFilter}
            anisotropy={16}
            offset={[0.5, 0]}
            repeat={[0.5, 1]}
          />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
};

const useVideo = (video: HTMLVideoElement) => {
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
