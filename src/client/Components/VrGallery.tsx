import { useCallback, useState } from "react";
import { useFileServerSocket } from "../hooks/useFileServerSocket";
import { Controllers } from "./Vr/Controllers";
import { FileExplorer } from "./Vr/FileExplorer";
import { MediaRouter } from "./Vr/MediaItem/MediaRouter";

export const VrGallery = () => {
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

      <FileExplorer files={files} index={index} position={[-1, 1.75, -0.5]} />

      <mesh position={[0, 1.5, -1]}>
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
