import { Text } from "@react-three/drei";
import { MediaInfo } from "../../hooks/useFileServerSocket.types";

export interface FileExplorerProps {
  files: MediaInfo[];
  index: number;
  position?: [x: number, y: number, z: number];
  rotation?: [x: number, y: number, z: number];
}

export const FileExplorer = ({ files, index, ...props }: FileExplorerProps) => {
  const startIndex = Math.max(index - 10, 0);
  const endIndex = startIndex + 20;
  const listToDisplay = files.slice(startIndex, endIndex);
  const file = files[index];
  return (
    <mesh {...props} scale={[0.02, 0.02, 0.02]}>
      <mesh rotation={[0, 1, 0]}>
        <Text fontSize={1}>
          {listToDisplay
            .map((f, i) => {
              const index = `${startIndex + i}`.padStart(3, ".");
              return `${file.name === f.name ? "> " : ".  "} [${index}] ${f.name}`;
            })
            .join("\n")}
        </Text>
      </mesh>
    </mesh>
  );
};
