import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { Mesh } from "three";
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

  const smoothenScene = useMemo(() => {
    // Apply smooth shading to the 3D model
    // Note: This will mutate the original scene object
    scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.computeVertexNormals();
        child.material.flatShading = false;
      }
    });
    return scene;
  }, [scene]);

  return (
    <>
      <primitive
        object={smoothenScene}
        position={position}
        scale={scale}
        rotation={rotation}
      />
      <directionalLight
        position={[0.5, 1.0, 4.4]}
        castShadow
        intensity={Math.PI * 1}
      />
    </>
  );
};
