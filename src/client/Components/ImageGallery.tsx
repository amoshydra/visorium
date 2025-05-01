import { Masonry, RenderComponentProps } from "masonic";
import { ErrorBoundary } from "react-error-boundary";
import { useFileServerSocket } from "../hooks/useFileServerSocket";
import { MediaInfo } from "../hooks/useFileServerSocket.types";
import { ImageGalleryPlaceholder } from "./ImageGalleryPlaceholder";
import { Media } from "./Media";

export function ImageGallery() {
  const files = useFileServerSocket();

  if (files.length === 0) {
    return <ImageGalleryPlaceholder />;
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          <p>Something went wrong:</p>
          <pre>{error.message}</pre>
          <button onClick={resetErrorBoundary}>Try again</button>
        </div>
      )}
    >
      <Masonry
        columnWidth={190}
        items={files}
        itemKey={(data, index) => data?.src ?? index}
        render={MasonryCard}
      />
    </ErrorBoundary>
  );
}

const MasonryCard = ({
  data: { name, src, aspectRatio },
}: RenderComponentProps<MediaInfo>) => (
  <Media name={name} src={src} aspectRatio={aspectRatio} />
);
