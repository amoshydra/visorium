import { useTexture } from "@react-three/drei";
import { Suspense } from "react";
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
      <meshStandardMaterial
        emissiveIntensity={1}
        emissive={"white"}
        map={texture}
        emissiveMap={texture}
        metalness={1}
      />
    </mesh>
  );
};
