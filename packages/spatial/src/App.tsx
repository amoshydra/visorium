import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  XR,
  useXR,
  type XRStore,
} from "@react-three/xr";
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
}

interface SpatialAppProps {
  media: SpatialMedia[];
  activeIndex?: number;
  onNavigate?: (index: number) => void;
  onClose?: () => void;
  store: XRStore;
}

type MediaKind = "image" | "video" | "model" | "splat" | "unsupported";

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

export function SpatialApp({
  media,
  activeIndex = 0,
  onNavigate,
  onClose,
  store,
}: SpatialAppProps) {
  const [index, setIndex] = useState(() =>
    media.length > 0 ? Math.min(Math.max(activeIndex, 0), media.length - 1) : 0,
  );
  const [xrSupported, setXrSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = media[index];

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
      if (event.key === "Escape") onClose?.();
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

  const enterVr = async () => {
    try {
      await store.enterVR();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const kind = current ? getKind(current.name) : "unsupported";
  const spatialCapture =
    current != null &&
    (kind === "image" || kind === "video") &&
    isSpatialCapture(current.name);

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
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#151515"]} />
        <XR store={store}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[4, 6, 5]} intensity={2.2} />
          <hemisphereLight args={["#ffffff", "#242424", 1.2]} />
          <CameraRig spatial={spatialCapture} />
          <SceneErrorBoundary>
            <Suspense fallback={null}>
              <MediaScene
                media={current}
                kind={kind}
                spatialCapture={spatialCapture}
              />
            </Suspense>
          </SceneErrorBoundary>
          <DesktopControls disabled={spatialCapture} />
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
        <button type="button" onClick={() => navigate(-1)} disabled={media.length < 2}>
          ←
        </button>
        <button type="button" onClick={() => navigate(1)} disabled={media.length < 2}>
          →
        </button>
        <strong style={{ marginLeft: 8, overflow: "hidden", textOverflow: "ellipsis" }}>
          {current?.name ?? "No media"}
        </strong>
        <span style={{ opacity: 0.6 }}>
          {media.length > 0 ? `${index + 1} / ${media.length}` : ""}
        </span>
        <span style={{ flex: 1 }} />
        {xrSupported && (
          <button type="button" onClick={() => void enterVr()}>
            Enter VR
          </button>
        )}
        <button type="button" onClick={() => onClose?.()}>
          Close
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 16,
          maxWidth: 480,
          opacity: 0.8,
          fontSize: 13,
        }}
      >
        {kind === "splat"
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

function CameraRig({ spatial }: { spatial: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    if (spatial) {
      camera.position.set(0, 1.6, 0);
      camera.lookAt(0, 1.6, -1);
    } else {
      camera.position.set(0, 1.5, 3);
      camera.lookAt(0, 1.2, 0);
    }
    camera.updateProjectionMatrix();
  }, [camera, spatial]);

  return null;
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
