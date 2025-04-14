import { Masonry } from "masonic";
import { useFileServerSocket } from "../hooks/useFileServerSocket";
import { Media } from "./Media";

export function ImageGallery() {
  const files = useFileServerSocket();

  return (
    <div
      onMouseOver={({ target }) => {
        if (target instanceof HTMLVideoElement) {
          target.muted = false;
        }
      }}
      onMouseOut={({ target }) => {
        if (target instanceof HTMLVideoElement) {
          target.muted = true;
        }
      }}
    >
      <Masonry columnWidth={480} items={files} render={MasonryCard} />
    </div>
  );
}

const MasonryCard = ({ data: { name, src }, width }) => (
  <Media name={name} src={src} />
);
