import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { LinearToneMapping, Mesh } from "three";

export const ToneMapping = () => {
  const { gl, scene } = useThree(({ gl, scene }) => ({ gl, scene }));
  useEffect(() => {
    gl.toneMapping = LinearToneMapping;
    gl.toneMappingExposure = 1;
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.material.needsUpdate = true;
      }
    });
  }, [gl, scene]);
  return null;
};
