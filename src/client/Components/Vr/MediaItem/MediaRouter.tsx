import { ErrorBoundary } from "react-error-boundary";
import {
  gltfRegExp,
  imageRegExp,
  videoRegExp,
} from "../../../../shared/file-extension";
import { MediaInfo } from "../../../hooks/useFileServerSocket.types";
import { MediaMessage } from "../MediaMessage";
import { MediaComponent, MediaComponentProps } from "./interface";
import { MediaImage } from "./MediaImage";
import { MediaThreeDimensional } from "./MediaThreeDimensional";
import { MediaVideo } from "./MediaVideo";

export interface MediaRouterProps extends Omit<MediaComponentProps, "file"> {
  file: MediaInfo | null;
}

export const MediaRouter = ({ file, ...props }: MediaRouterProps) => {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <MediaMessage title={error.name} message={error.message} />
      )}
      resetKeys={[file?.src]}
    >
      <InternalMediaRouter file={file} {...props} />
    </ErrorBoundary>
  );
};

const InternalMediaRouter = ({ file, ...props }: MediaRouterProps) => {
  if (!file) throw new Error("no file available to preview");

  const MediaComponent = getMediaComponent(file);

  return <MediaComponent file={file} {...props} />;
};

const getMediaComponent = (file: MediaInfo): MediaComponent => {
  if (gltfRegExp.test(file.name)) {
    return MediaThreeDimensional;
  }
  if (imageRegExp.test(file.name)) {
    return MediaImage;
  }
  if (videoRegExp.test(file.name)) {
    return MediaVideo;
  }

  const extension = file.name.split(".").pop();
  throw new Error(`Unsupported file type: ${extension}. ${file.name}`);
};
