import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Box3, Vector3 } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const SplatScene = lazy(() => import("./SplatScene.js"));

const HINT_HIDE_DELAY = 7_000;

export interface LightboxMedia {
  name: string;
  src: string;
  aspectRatio?: string;
}

export interface LightboxViewerOptions {
  media: LightboxMedia;
  onError?: (message: string) => void;
}

interface LightboxAppProps extends LightboxViewerOptions {
  onReady?: () => void;
}

type MediaKind = "model" | "splat" | "unsupported";
type RenderableKind = Exclude<MediaKind, "unsupported">;

const modelPattern = /\.(glb|gltf)$/i;
const splatPattern = /\.(splat|ksplat|spz|ply|sogs)$/i;

const getKind = (name: string): MediaKind => {
  if (modelPattern.test(name)) return "model";
  if (splatPattern.test(name)) return "splat";
  return "unsupported";
};

const getLoadingStatus = (kind: MediaKind) => {
  if (kind === "model") return "Loading model…";
  if (kind === "splat") return "Loading splat…";
  return null;
};

const getViewerLabel = (kind: RenderableKind, name: string) =>
  `${kind === "model" ? "3D model" : "Gaussian splat"} viewer: ${name}`;

export function LightboxApp({ media, onError, onReady }: LightboxAppProps) {
  const kind = getKind(media.name);
  const [status, setStatus] = useState<string | null>(() =>
    getLoadingStatus(kind),
  );
  const [resetToken, setResetToken] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const [coarsePointer, setCoarsePointer] = useState(false);

  const clearStatus = useCallback(() => setStatus(null), []);
  const handleError = useCallback(
    (message: string) => {
      setStatus(null);
      onError?.(message);
    },
    [onError],
  );

  useEffect(() => {
    if (kind === "unsupported") {
      onError?.(`Unsupported 3D format: ${media.name}`);
    }
  }, [kind, media.name, onError]);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarsePointer(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!hintVisible || status !== null) return;
    const timeout = window.setTimeout(
      () => setHintVisible(false),
      HINT_HIDE_DELAY,
    );
    return () => window.clearTimeout(timeout);
  }, [hintVisible, status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setResetToken((token) => token + 1);
        setHintVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (kind === "unsupported") {
    return null;
  }

  const hintText = coarsePointer
    ? "One finger orbit · pinch to zoom · two fingers to pan"
    : "Drag to orbit · scroll or pinch to zoom · right-drag to pan";

  return (
    <div
      role="region"
      aria-label={`${getViewerLabel(kind, media.name)}. ${hintText}.`}
      aria-busy={status !== null}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#0b0b0b",
      }}
      onPointerDown={() => setHintVisible(false)}
      onDoubleClick={() => setResetToken((token) => token + 1)}
    >
      <Canvas
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        fallback={
          <div
            style={{
              display: "grid",
              width: "100%",
              height: "100%",
              placeItems: "center",
              padding: 24,
              color: "#f5b5b5",
              fontFamily: "system-ui, sans-serif",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            3D rendering is not available in this browser.
          </div>
        }
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0b0b0b");
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            handleError(
              "The 3D renderer lost its graphics context. Try again or reopen the file.",
            );
          });
          onReady?.();
        }}
      >
        <color attach="background" args={["#0b0b0b"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} />
        <hemisphereLight args={["#ffffff", "#242424", 1.2]} />
        <CameraRig kind={kind} resetToken={resetToken} />
        <SceneErrorBoundary onError={handleError}>
          <Suspense fallback={null}>
            {kind === "model" ? (
              <ModelScene src={media.src} onReady={clearStatus} />
            ) : (
              <SplatScene
                src={media.src}
                onStatus={setStatus}
                onError={handleError}
              />
            )}
          </Suspense>
        </SceneErrorBoundary>
      </Canvas>

      {status && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#ccc",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          {status}
        </div>
      )}

      <button
        type="button"
        aria-label="Reset 3D view"
        aria-keyshortcuts="R"
        title="Reset view (R)"
        onClick={() => setResetToken((token) => token + 1)}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 2,
          minHeight: 44,
          padding: "0 14px",
          borderRadius: 999,
          border: "1px solid rgba(255, 255, 255, 0.2)",
          background: "rgba(17, 17, 17, 0.72)",
          color: "#ddd",
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}
      >
        Reset
      </button>

      {hintVisible ? (
        <div
          id="spatial-controls-hint"
          style={{
            position: "absolute",
            left: 12,
            bottom: "max(12px, env(safe-area-inset-bottom))",
            zIndex: 2,
            maxWidth: "min(26rem, calc(100% - 24px))",
            padding: "7px 10px",
            borderRadius: 8,
            background: "rgba(0, 0, 0, 0.58)",
            color: "rgba(255, 255, 255, 0.72)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 11,
            lineHeight: 1.4,
            pointerEvents: "none",
          }}
        >
          {hintText}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Show 3D controls"
          title="Show controls"
          onClick={() => setHintVisible(true)}
          style={{
            position: "absolute",
            left: 12,
            bottom: "max(12px, env(safe-area-inset-bottom))",
            zIndex: 2,
            width: 44,
            height: 44,
            padding: 0,
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(17, 17, 17, 0.72)",
            color: "#ddd",
            fontFamily: "system-ui, sans-serif",
            fontSize: 15,
            cursor: "pointer",
            backdropFilter: "blur(6px)",
          }}
        >
          ?
        </button>
      )}
    </div>
  );
}

function CameraRig({
  kind,
  resetToken,
}: {
  kind: RenderableKind;
  resetToken: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    const target =
      kind === "model" ? new Vector3(0, 1.05, 0) : new Vector3(0, 1.15, 0);
    const position =
      kind === "model" ? new Vector3(0, 1.6, 4.4) : new Vector3(0, 1.5, 3);

    camera.position.copy(position);
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
  }, [camera, kind, resetToken]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan
      enableDamping
      minDistance={0.5}
      maxDistance={12}
    />
  );
}

function ModelScene({
  src,
  onReady,
}: {
  src: string;
  onReady: () => void;
}) {
  const { scene } = useGLTF(src);

  useEffect(() => {
    onReady();
  }, [onReady, scene]);

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
  { children: ReactNode; onError?: (message: string) => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Spatial lightbox scene error", error, info);
    this.props.onError?.(
      "Could not render this 3D model. The file may be damaged or use an unsupported format.",
    );
  }

  render() {
    if (this.state.error) {
      return null;
    }
    return this.props.children;
  }
}
