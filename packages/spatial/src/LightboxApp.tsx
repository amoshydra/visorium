import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Box3, Vector3 } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const SplatScene = lazy(() => import("./SplatScene.js"));

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

const modelPattern = /\.(glb|gltf)$/i;
const splatPattern = /\.(splat|ksplat|spz|ply|sogs)$/i;

const getKind = (name: string): MediaKind => {
  if (modelPattern.test(name)) return "model";
  if (splatPattern.test(name)) return "splat";
  return "unsupported";
};

export function LightboxApp({ media, onError, onReady }: LightboxAppProps) {
  const kind = getKind(media.name);

  useEffect(() => {
    if (kind === "unsupported") {
      onError?.(`Unsupported 3D format: ${media.name}`);
    }
  }, [kind, media.name, onError]);

  if (kind === "unsupported") {
    return null;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#0b0b0b",
      }}
    >
      <Canvas
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0b0b0b");
          onReady?.();
        }}
      >
        <color attach="background" args={["#0b0b0b"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} />
        <hemisphereLight args={["#ffffff", "#242424", 1.2]} />
        <CameraRig kind={kind} />
        <SceneErrorBoundary onError={onError}>
          <Suspense fallback={null}>
            {kind === "model" ? (
              <ModelScene src={media.src} />
            ) : (
              <SplatScene src={media.src} />
            )}
          </Suspense>
        </SceneErrorBoundary>
        <OrbitControls
          makeDefault
          enablePan
          enableDamping
          minDistance={0.5}
          maxDistance={12}
          target={[0, 1.15, 0]}
        />
      </Canvas>
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          padding: "5px 8px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.5)",
          color: "rgba(255,255,255,0.7)",
          fontFamily: "system-ui, sans-serif",
          fontSize: 11,
          pointerEvents: "none",
        }}
      >
        Drag to orbit · pinch or wheel to zoom · two-finger drag to pan
      </div>
    </div>
  );
}

function CameraRig({ kind }: { kind: MediaKind }) {
  const { camera } = useThree();

  useEffect(() => {
    if (kind === "model") {
      camera.position.set(0, 1.6, 4.4);
      camera.lookAt(0, 1.05, 0);
    } else {
      camera.position.set(0, 1.5, 3);
      camera.lookAt(0, 1.15, 0);
    }
    camera.updateProjectionMatrix();
  }, [camera, kind]);

  return null;
}

function ModelScene({ src }: { src: string }) {
  const { scene } = useGLTF(src);
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
    this.props.onError?.(error.message);
  }

  render() {
    if (this.state.error) {
      return null;
    }
    return this.props.children;
  }
}
