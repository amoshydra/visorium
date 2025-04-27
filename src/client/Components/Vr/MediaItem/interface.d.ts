import { ComponentType } from "react";
import { MediaInfo } from "../../../hooks/useFileServerSocket.types";

export type VectorLiked = [x: number, y: number, z: number];

export interface MediaComponentProps {
  file: MediaInfo;
  position: VectorLiked;
  scale: VectorLiked;
  rotation: VectorLiked;
}

export type MediaComponent = ComponentType<MediaComponentProps>;
