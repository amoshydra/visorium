import { useTexture } from "@react-three/drei";
import { Suspense } from "react";
import { DoubleSide } from "three";
import { MediaMessage } from "../MediaMessage";
import { MediaComponent } from "./interface";

export const MediaImage: MediaComponent = ({ file, ...props }) => {
  return (
    <Suspense fallback={<MediaMessage message="Loading..." />}>
      <InternalMediaImage file={file} {...props} />
    </Suspense>
  );
};

const InternalMediaImage: MediaComponent = ({ file, ...props }) => {
  const texture = useTexture(file.src);
  const [w, h] = file.aspectRatio?.split("/") || ["1", "1"];
  const r = parseInt(w, 10) / parseInt(h, 10);
  return (
    <mesh {...props}>
      <planeGeometry args={[r, 1]} />
      <meshBasicMaterial
        map={texture}
        side={DoubleSide} // Render both sides (optional)
        toneMapped={false} // Often desirable for direct image display
      />
    </mesh>
  );
};
