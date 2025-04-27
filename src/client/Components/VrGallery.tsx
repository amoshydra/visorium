import { Text } from "@react-three/drei";
import { useCallback, useRef, useState } from "react";
import { Mesh } from "three";
import { useFileServerSocket } from "../hooks/useFileServerSocket";
import { Controllers } from "./Vr/Controllers";
import { MediaRouter } from "./Vr/MediaItem/MediaRouter";

export const VrGallery = () => {
  const meshRef = useRef<Mesh>(null);
  const [index, setIndex] = useState(0);
  const files = useFileServerSocket();
  const file = files[index];

  const [meshRotation, setMeshRotation] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [meshPosition, setMeshPosition] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [meshScale, setMeshScale] = useState<[number, number, number]>([
    1, 1, 1,
  ]);

  const fileLength = files.length;

  const onButtonPress = useCallback(
    (id: "l1" | "l2" | "r1" | "r2") => {
      switch (id) {
        case "l1":
        case "r1":
          setIndex((prev) => {
            const newIndex = (prev - 1 + fileLength) % fileLength;
            return newIndex;
          });
          break;
        case "l2":
        case "r2":
          setIndex((prev) => {
            const newIndex = (prev + 1) % fileLength;
            return newIndex;
          });
          break;
        default:
          break;
      }
    },
    [fileLength],
  );

  return (
    <>
      <Controllers
        onButtonPress={onButtonPress}
        onRotationChange={setMeshRotation}
        onPositionChange={setMeshPosition}
        onScaleChange={setMeshScale}
      />

      <mesh rotation={[0, 1, 0]}>
        <mesh position={[0, 1, -1]} scale={[0.02, 0.02, 0.02]}>
          <Text fontSize={1}>
            {files
              .map((f) => `${file.name === f.name ? "> " : "  "} ${f.name}`)
              .join("\n")}
          </Text>
        </mesh>
      </mesh>
      <mesh position={[0, 1, -1]}>
        <MediaRouter
          file={file}
          position={meshPosition}
          scale={meshScale}
          rotation={meshRotation}
        />
      </mesh>
      <hemisphereLight
        castShadow
        color={0xf0f0f0}
        groundColor={0x242424}
        intensity={1}
      />
    </>
  );
};
