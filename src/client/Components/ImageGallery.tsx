import { Masonry, RenderComponentProps } from "masonic";
import { MediaInfo, useFileServerSocket } from "../hooks/useFileServerSocket";
import { Media } from "./Media";

export function ImageGallery() {
  const files = useFileServerSocket();

  return (
    <div>
      <Masonry columnWidth={480} items={files} render={MasonryCard} />
    </div>
  );
}

const MasonryCard = ({
  data: { name, src, aspectRatio },
}: RenderComponentProps<MediaInfo>) => (
  <Media name={name} src={src} aspectRatio={aspectRatio} />
);
