import { useTexture } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { DoubleSide, LinearFilter, SRGBColorSpace } from "three";
import { MediaInfo } from "../../../hooks/useFileServerSocket.types";
import { MediaMessage } from "../MediaMessage";
import { MediaComponent } from "./interface";
import { useWebXrLayerCompat } from "./useWebXrLayerCompat";

export const MediaImageStereo: MediaComponent = ({ file, ...props }) => {
  return (
    <Suspense fallback={<MediaMessage message="Loading..." />}>
      <InternalMediaImageStereo file={file} {...props} />
    </Suspense>
  );
};

const InternalMediaImageStereo: MediaComponent = ({ file, ...props }) => {
  const [w, h] = file.aspectRatio?.split("/") || ["1", "1"];
  const r = parseInt(w, 10) / parseInt(h, 10);
  return <StereoImageDisplay file={file} r={r} {...props} />;
};

interface StereoImageDisplayProps {
  file: MediaInfo;
  r: number;
  position: [x: number, y: number, z: number];
  scale: [x: number, y: number, z: number];
  rotation: [x: number, y: number, z: number];
}

function StereoImageDisplay({ file, r, ...props }: StereoImageDisplayProps) {
  useWebXrLayerCompat();

  const textureLeft = useTexture(file.src, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.offset.set(0, 0);
    texture.repeat.set(0.5, 1);
  });
  const textureRight = useMemo(() => {
    const texture = textureLeft.clone();
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.offset.set(0.5, 0);
    texture.repeat.set(0.5, 1);
    return texture;
  }, [textureLeft]);

  const ratio = useMemo(() => [r / 2, 1] as const, [r]);

  return (
    // Group to hold both planes, allowing easy positioning
    <group {...props}>
      {/* Plane for the Left Eye */}
      <mesh layers={[1]}>
        {/* Geometry for the plane */}
        <planeGeometry args={ratio} />
        {/* Basic material using the left half texture, ignores lighting */}
        <meshBasicMaterial
          map={textureLeft}
          side={DoubleSide} // Render both sides (optional)
          toneMapped={false} // Often desirable for direct image display
        />
      </mesh>

      {/* Plane for the Right Eye - Positioned exactly overlapping the left */}
      <mesh layers={[2]}>
        {/* Geometry for the plane (same size) */}
        <planeGeometry args={ratio} />
        {/* Basic material using the right half texture, ignores lighting */}
        <meshBasicMaterial
          map={textureRight}
          side={DoubleSide} // Render both sides (optional)
          toneMapped={false} // Often desirable for direct image display
        />
      </mesh>
    </group>
  );
}
