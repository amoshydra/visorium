import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { XR, useXR, type XRStore } from "@react-three/xr";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  BackSide,
  Box3,
  CanvasTexture,
  DoubleSide,
  SRGBColorSpace,
  Vector3,
  VideoTexture,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

export interface SpatialMedia {
  name: string;
  src: string;
  aspectRatio?: string;
  thumbSrc?: string;
  posterSrc?: string;
}

interface SpatialAppProps {
  media: SpatialMedia[];
  activeIndex?: number;
  initialFocus?: boolean;
  onNavigate?: (index: number) => void;
  onClose?: () => void;
  store: XRStore;
}

type MediaKind = "image" | "video" | "model" | "splat" | "unsupported";
type ViewMode = "gallery" | "focus";

const PAGE_SIZE = 12;
const COLUMNS = 4;

const buttonStyle = {
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
} as const;

const imagePattern = /\.(bmp|gif|jpe?g|png|tiff?|webp|heic|heif|ico|svg|dds|raw)$/i;
const videoPattern = /\.(mp4|mov|avi|mkv|flv|wmv|webm|3gp|3g2)$/i;
const modelPattern = /\.(glb|gltf)$/i;
const splatPattern = /\.(splat|ksplat|spz|ply|sogs)$/i;

const getKind = (name: string): MediaKind => {
  if (modelPattern.test(name)) return "model";
  if (splatPattern.test(name)) return "splat";
  if (videoPattern.test(name)) return "video";
  if (imagePattern.test(name)) return "image";
  return "unsupported";
};

const isSpatialCapture = (name: string) =>
  /(?:^|[._-])(360|equirect|vr180|180)(?:[._-]|$)/i.test(name);

const parseAspectRatio = (value: string | undefined) => {
  if (!value) return 1;
  const [width, height] = value.split("/").map(Number);
  return width > 0 && height > 0 ? width / height : 1;
};

const getThumbnailSource = (media: SpatialMedia, kind: MediaKind) => {
  if (kind === "image") return media.thumbSrc ?? media.src;
  if (kind === "video") return media.posterSrc ?? media.thumbSrc;
  return undefined;
};

export function SpatialApp({
  media,
  activeIndex = 0,
  initialFocus = false,
  onNavigate,
  onClose,
  store,
}: SpatialAppProps) {
  const initialIndex =
    media.length > 0 ? Math.min(Math.max(activeIndex, 0), media.length - 1) : 0;
  const [index, setIndex] = useState(initialIndex);
  const [mode, setMode] = useState<ViewMode>(
    initialFocus ? "focus" : "gallery",
  );
  const [page, setPage] = useState(() => Math.floor(initialIndex / PAGE_SIZE));
  const [xrSupported, setXrSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = media[index];
  const kind = current ? getKind(current.name) : "unsupported";
  const spatialCapture =
    current != null &&
    (kind === "image" || kind === "video") &&
    isSpatialCapture(current.name);
  const pageCount = Math.max(1, Math.ceil(media.length / PAGE_SIZE));

  useEffect(() => {
    let active = true;
    void navigator.xr
      ?.isSessionSupported("immersive-vr")
      .then((supported) => {
        if (active) setXrSupported(supported);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mode === "focus") {
          setPage(Math.floor(index / PAGE_SIZE));
          setMode("gallery");
        } else {
          onClose?.();
        }
        return;
      }

      if (mode === "gallery") {
        if (event.key === "ArrowLeft") changePage(-1);
        if (event.key === "ArrowRight") changePage(1);
        return;
      }

      if (event.key === "ArrowLeft") navigate(-1);
      if (event.key === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const navigate = (delta: number) => {
    if (media.length === 0) return;
    const next = (index + delta + media.length) % media.length;
    setIndex(next);
    onNavigate?.(next);
  };

  const changePage = (delta: number) => {
    setPage((current) => (current + delta + pageCount) % pageCount);
  };

  const openMedia = (nextIndex: number) => {
    setIndex(nextIndex);
    setPage(Math.floor(nextIndex / PAGE_SIZE));
    setMode("focus");
    onNavigate?.(nextIndex);
  };

  const backToGallery = () => {
    setPage(Math.floor(index / PAGE_SIZE));
    setMode("gallery");
  };

  const enterVr = async () => {
    try {
      await store.enterVR();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : String(cause),
      );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#111",
        color: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Canvas
        camera={{ position: [0, 1.6, 1.8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#151515"]} />
        <XR store={store}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[4, 6, 5]} intensity={2.2} />
          <hemisphereLight args={["#ffffff", "#242424", 1.2]} />
          <CameraRig mode={mode} spatial={spatialCapture} />
          <SceneErrorBoundary>
            <Suspense fallback={null}>
              {mode === "gallery" ? (
                <GalleryWall
                  media={media}
                  page={page}
                  onOpen={openMedia}
                />
              ) : (
                <MediaScene
                  media={current}
                  kind={kind}
                  spatialCapture={spatialCapture}
                />
              )}
            </Suspense>
          </SceneErrorBoundary>
          <DesktopControls disabled={mode === "gallery" || spatialCapture} />
        </XR>
      </Canvas>

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {mode === "gallery" ? (
          <>
            <strong>3D gallery</strong>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => changePage(-1)}
              disabled={pageCount < 2}
            >
              ‹
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => changePage(1)}
              disabled={pageCount < 2}
            >
              ›
            </button>
            <span style={{ opacity: 0.65 }}>
              Page {page + 1} / {pageCount} · {media.length} items
            </span>
          </>
        ) : (
          <>
            <button type="button" style={buttonStyle} onClick={backToGallery}>
              Gallery
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => navigate(-1)}
              disabled={media.length < 2}
            >
              ←
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => navigate(1)}
              disabled={media.length < 2}
            >
              →
            </button>
            <strong style={{ marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
              {current?.name ?? "No media"}
            </strong>
            <span style={{ opacity: 0.6 }}>
              {media.length > 0 ? `${index + 1} / ${media.length}` : ""}
            </span>
          </>
        )}
        <span style={{ flex: 1 }} />
        {xrSupported && (
          <button type="button" style={buttonStyle} onClick={() => void enterVr()}>
            Enter VR
          </button>
        )}
        <button type="button" style={buttonStyle} onClick={() => onClose?.()}>
          Close
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 16,
          maxWidth: 560,
          opacity: 0.8,
          fontSize: 13,
        }}
      >
        {mode === "gallery"
          ? "Select a card to enter focus view. Use the arrow keys to change page."
          : kind === "splat"
            ? "Splat preview is not implemented yet."
            : kind === "unsupported"
              ? "Unsupported media type."
              : spatialCapture
                ? "360/180 spatial preview. Drag to look around."
                : "Drag to orbit. Use arrow keys to navigate."}
        {error ? <div style={{ color: "#ff9b9b", marginTop: 8 }}>{error}</div> : null}
      </div>
    </div>
  );
}

function DesktopControls({ disabled }: { disabled: boolean }) {
  const presenting = useXR((state) => state.session != null);
  return (
    <OrbitControls
      enabled={!presenting && !disabled}
      enablePan={false}
      minDistance={0.8}
      maxDistance={8}
    />
  );
}

function CameraRig({ mode, spatial }: { mode: ViewMode; spatial: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    if (mode === "gallery") {
      camera.position.set(0, 1.6, 1.8);
      camera.lookAt(0, 1.55, -2.5);
    } else if (spatial) {
      camera.position.set(0, 1.6, 0);
      camera.lookAt(0, 1.6, -1);
    } else {
      camera.position.set(0, 1.5, 3);
      camera.lookAt(0, 1.2, 0);
    }
    camera.updateProjectionMatrix();
  }, [camera, mode, spatial]);

  return null;
}

interface GalleryWallProps {
  media: SpatialMedia[];
  page: number;
  onOpen: (index: number) => void;
}

function GalleryWall({ media, page, onOpen }: GalleryWallProps) {
  const start = page * PAGE_SIZE;
  const visible = media.slice(start, start + PAGE_SIZE);

  return (
    <group position={[0, 0, -2.5]}>
      {visible.map((item, index) => {
        const column = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);
        const x = (column - (COLUMNS - 1) / 2) * 0.95;
        const y = 1.55 + (1 - row) * 0.78;
        return (
          <GalleryCard
            key={item.name}
            media={item}
            position={[x, y, 0]}
            onOpen={() => onOpen(start + index)}
          />
        );
      })}
    </group>
  );
}

function GalleryCard({
  media,
  position,
  onOpen,
}: {
  media: SpatialMedia;
  position: [number, number, number];
  onOpen: () => void;
}) {
  const kind = getKind(media.name);
  const source = getThumbnailSource(media, kind);

  return (
    <group position={position}>
      {source ? (
        <Suspense fallback={<PlaceholderCard label={labelFor(kind, media.name)} />}>
          <TexturedCard source={source} onOpen={onOpen} />
        </Suspense>
      ) : (
        <PlaceholderCard label={labelFor(kind, media.name)} onOpen={onOpen} />
      )}
    </group>
  );
}

function TexturedCard({
  source,
  onOpen,
}: {
  source: string;
  onOpen: () => void;
}) {
  const texture = useTexture(source, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
  });

  return (
    <mesh onClick={onOpen} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "default")}>
      <planeGeometry args={[0.82, 0.64]} />
      <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
    </mesh>
  );
}

function PlaceholderCard({
  label,
  onOpen,
}: {
  label: string;
  onOpen?: () => void;
}) {
  const texture = useMemo(() => makeTextTexture(label), [label]);

  return (
    <mesh onClick={onOpen} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "default")}>
      <planeGeometry args={[0.82, 0.64]} />
      <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
    </mesh>
  );
}

function makeTextTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 400;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#1c1c1f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(255,255,255,0.25)";
    context.lineWidth = 8;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = "#d8d8e0";
    context.font = "bold 44px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, canvas.width / 2, canvas.height / 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function labelFor(kind: MediaKind, name: string) {
  if (kind === "model") return "3D";
  if (kind === "splat") return "SPLAT";
  if (kind === "video") return "VIDEO";
  if (kind === "unsupported") return "UNSUPPORTED";
  return name.split(".").pop()?.toUpperCase() ?? "MEDIA";
}

interface MediaSceneProps {
  media: SpatialMedia | undefined;
  kind: MediaKind;
  spatialCapture: boolean;
}

function MediaScene({ media, kind, spatialCapture }: MediaSceneProps) {
  if (!media) return null;

  if (kind === "image") {
    return <ImageScene media={media} spatialCapture={spatialCapture} />;
  }
  if (kind === "video") {
    return <VideoScene media={media} spatialCapture={spatialCapture} />;
  }
  if (kind === "model") {
    return <ModelScene media={media} />;
  }

  return null;
}

function ImageScene({
  media,
  spatialCapture,
}: {
  media: SpatialMedia;
  spatialCapture: boolean;
}) {
  const texture = useTexture(media.src, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
  });
  const aspect = parseAspectRatio(media.aspectRatio);

  if (spatialCapture) {
    return (
      <mesh>
        <sphereGeometry args={[5, 64, 32]} />
        <meshBasicMaterial map={texture} side={BackSide} toneMapped={false} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 1.4, 0]}>
      <planeGeometry args={[Math.min(aspect * 2, 4), 2]} />
      <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
    </mesh>
  );
}

function VideoScene({
  media,
  spatialCapture,
}: {
  media: SpatialMedia;
  spatialCapture: boolean;
}) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [texture, setTexture] = useState<VideoTexture | null>(null);
  const aspect = parseAspectRatio(media.aspectRatio);

  useEffect(() => {
    const element = document.createElement("video");
    element.src = media.src;
    element.loop = true;
    element.muted = true;
    element.playsInline = true;
    element.autoplay = true;
    element.crossOrigin = "use-credentials";
    void element.play().catch(() => {});
    setVideo(element);

    return () => {
      element.pause();
      element.src = "";
      element.load();
      element.remove();
      setVideo(null);
    };
  }, [media.src]);

  useEffect(() => {
    if (!video) return;
    const next = new VideoTexture(video);
    next.colorSpace = SRGBColorSpace;
    next.needsUpdate = true;
    setTexture(next);

    return () => {
      next.dispose();
      setTexture(null);
    };
  }, [video]);

  if (!texture) return null;

  if (spatialCapture) {
    return (
      <mesh>
        <sphereGeometry args={[5, 64, 32]} />
        <meshBasicMaterial map={texture} side={BackSide} toneMapped={false} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 1.4, 0]}>
      <planeGeometry args={[Math.min(aspect * 2, 4), 2]} />
      <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
    </mesh>
  );
}

function ModelScene({ media }: { media: SpatialMedia }) {
  const { scene } = useGLTF(media.src);
  const object = useMemo(() => {
    const clone = cloneSkeleton(scene);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2 / max;

    clone.scale.setScalar(scale);
    clone.position.set(
      -center.x * scale,
      -center.y * scale + 1.1,
      -center.z * scale,
    );
    return clone;
  }, [scene]);

  return (
    <group>
      <primitive object={object} />
      <gridHelper args={[6, 12, "#333", "#222"]} position={[0, 0.01, 0]} />
    </group>
  );
}

class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Spatial scene error", error, info);
  }

  render() {
    if (this.state.error) {
      return null;
    }
    return this.props.children;
  }
}
