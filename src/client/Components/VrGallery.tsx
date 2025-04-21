import { Environment, useGLTF } from "@react-three/drei";
import { Ref, useCallback, useRef, useState } from "react";
import { Mesh } from "three";
import { useFileServerSocket } from "../hooks/useFileServerSocket";
import { MediaInfo } from "../hooks/useFileServerSocket.types";
import { Controllers } from "./Vr/Controllers";

export const VrGallery = () => {
  const meshRef = useRef<Mesh>(null);
  const [index, setIndex] = useState(0);
  const files = useFileServerSocket();
  const file = files[index];

  const onButtonPress = useCallback(
    (id: "l1" | "l2" | "r1" | "r2") => {
      switch (id) {
        case "l1":
        case "r1":
          setIndex((prev) => {
            const newIndex = (prev - 1 + files.length) % files.length;
            if (!files[newIndex]) return 0;
            return newIndex;
          });
          break;
        case "l2":
        case "r2":
          setIndex((prev) => {
            const newIndex = (prev + 1) % files.length;
            if (!files[newIndex]) return 0;
            return newIndex;
          });
          break;
        default:
          break;
      }
    },
    [files],
  );

  return (
    <>
      <Controllers modelRef={meshRef} onButtonPress={onButtonPress} />

      <mesh position={[0, 0.5, -1]} scale={[0.5, 0.5, 0.5]}>
        {/* Load the 3D model */}
        {file && <Model ref={meshRef} file={file} />}
      </mesh>

      {/* Add environment mapping for better lighting */}
      <Environment preset="studio" />
    </>
  );
};

// Component to load and display the 3D model
interface ModelProps {
  file: MediaInfo;
  ref: Ref<Mesh>;
}

const v = Math.random();
function Model({ file, ref }: ModelProps) {
  const { scene } = useGLTF(file.src + "?v=" + v);
  return (
    <mesh ref={ref}>
      <primitive object={scene} />
    </mesh>
  );
}
