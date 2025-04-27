import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense } from "react";
import { MediaMessage } from "../MediaMessage";
import { MediaComponent } from "./interface";

export const MediaThreeDimensional: MediaComponent = ({ file, ...props }) => {
  return (
    <Suspense fallback={<MediaMessage message="Loading..." />}>
      <InternalMediaThreeDimensional file={file} {...props} />
    </Suspense>
  );
};

const InternalMediaThreeDimensional: MediaComponent = ({
  file,
  position,
  scale,
  rotation,
}) => {
  const { scene } = useGLTF(file.src);

  useFrame(() => {});

  return (
    <>
      <primitive
        object={scene}
        position={position}
        scale={scale}
        rotation={rotation}
      />
      ;
      <directionalLight
        position={[0.5, 1.0, 4.4]}
        castShadow
        intensity={Math.PI * 1}
      />
    </>
  );
};
