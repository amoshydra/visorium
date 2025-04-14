import { CSSProperties } from "react";

interface MediaProp {
  src: string;
  name: string;
  style: CSSProperties;
}

const videoRegexp = /\.(mp4|mov)$/i;

export const Media = ({ src, name, style }: MediaProp) => {
  if (videoRegexp.test(name)) {
    return (
      <figure className="media" style={style}>
        <Caption label={name} />
        <video
          playsInline
          preload="metadata"
          loop
          autoPlay
          muted
          controls
          key={name}
          src={src}
        />
      </figure>
    );
  }

  return (
    <figure className="media" style={style}>
      <Caption label={name} />
      <img loading="lazy" src={src} alt={name} />
    </figure>
  );
};

const Caption = ({ label }: { label: string }) => {
  return <figcaption>{label}</figcaption>;
};
