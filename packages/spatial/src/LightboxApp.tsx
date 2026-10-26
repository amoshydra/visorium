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
import {
  WalkControls,
  WalkHeightControls,
  WalkJoystick,
  type MoveInput,
  type NavigationMode,
} from "./NavigationControls.js";

const SplatScene = lazy(() => import("./SplatScene.js"));

const HINT_HIDE_DELAY = 7_000;
const ORIENTATION_STEP = 90;
const DEG_TO_RAD = Math.PI / 180;
const STORAGE_PREFIX = "visorium:spatial-view:";
const SETTINGS_STORAGE_KEY = "visorium:spatial-settings:v1";
const DEFAULT_WALK_SETTINGS = {
  speed: 0.8,
  lookSensitivity: 0.6,
};

export interface LightboxMedia {
  name: string;
  src: string;
  mtime?: number;
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
type OrientationAxis = "x" | "y" | "z";

interface Orientation {
  x: number;
  y: number;
  z: number;
}

interface StoredView {
  mode?: NavigationMode;
  orientation: Orientation;
}

interface WalkSettings {
  speed: number;
  lookSensitivity: number;
}

const ZERO_ORIENTATION: Orientation = { x: 0, y: 0, z: 0 };
const SPEED_RANGE = { min: 0.3, max: 2.5, step: 0.1 };
const LOOK_RANGE = { min: 0.25, max: 1.5, step: 0.05 };

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

const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360;

const getStorageKey = (name: string, mtime?: number) =>
  `${STORAGE_PREFIX}${encodeURIComponent(name)}:${mtime ?? ""}`;

const readOrientation = (value: unknown): Orientation => {
  if (!value || typeof value !== "object") return { ...ZERO_ORIENTATION };

  const candidate = value as Record<string, unknown>;
  const readAxis = (axis: OrientationAxis) => {
    const axisValue = candidate[axis];
    return typeof axisValue === "number" && Number.isFinite(axisValue)
      ? normalizeDegrees(axisValue)
      : 0;
  };

  return {
    x: readAxis("x"),
    y: readAxis("y"),
    z: readAxis("z"),
  };
};

const readStoredView = (key: string): StoredView => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { orientation: { ...ZERO_ORIENTATION } };

    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") {
      return { orientation: { ...ZERO_ORIENTATION } };
    }

    const candidate = value as Record<string, unknown>;
    return {
      mode: candidate.mode === "walk" || candidate.mode === "orbit"
        ? candidate.mode
        : undefined,
      orientation: readOrientation(candidate.orientation),
    };
  } catch {
    return { orientation: { ...ZERO_ORIENTATION } };
  }
};

const writeStoredView = (key: string, view: StoredView) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(view));
  } catch {
    // Storage can be unavailable in private browsing or when full.
  }
};

const clampSetting = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : null;

const readWalkSettings = (): WalkSettings => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WALK_SETTINGS };

    const value = JSON.parse(raw) as Record<string, unknown>;
    return {
      speed:
        clampSetting(
          value.speed,
          SPEED_RANGE.min,
          SPEED_RANGE.max,
        ) ?? DEFAULT_WALK_SETTINGS.speed,
      lookSensitivity:
        clampSetting(
          value.lookSensitivity,
          LOOK_RANGE.min,
          LOOK_RANGE.max,
        ) ?? DEFAULT_WALK_SETTINGS.lookSensitivity,
    };
  } catch {
    return { ...DEFAULT_WALK_SETTINGS };
  }
};

const writeWalkSettings = (settings: WalkSettings) => {
  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Storage can be unavailable in private browsing or when full.
  }
};

const controlButtonStyle = (active = false) => ({
  minHeight: 44,
  padding: "0 12px",
  border: active
    ? "1px solid #4c6f9d"
    : "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: 999,
  background: active ? "#22354b" : "rgba(17, 17, 17, 0.72)",
  color: active ? "#dcecff" : "#ddd",
  fontFamily: "system-ui, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  backdropFilter: "blur(6px)",
});

export function LightboxApp({ media, onError, onReady }: LightboxAppProps) {
  const kind = getKind(media.name);
  const storageKey = useMemo(
    () => getStorageKey(media.name, media.mtime),
    [media.name, media.mtime],
  );
  const [storedView] = useState(() => readStoredView(storageKey));
  const [status, setStatus] = useState<string | null>(() =>
    getLoadingStatus(kind),
  );
  const [resetToken, setResetToken] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>(
    () => storedView.orientation,
  );
  const [mode, setMode] = useState<NavigationMode>(
    () => storedView.mode ?? "orbit",
  );
  const [orientationOpen, setOrientationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [walkSettings, setWalkSettings] =
    useState<WalkSettings>(readWalkSettings);
  const moveRef = useRef<MoveInput>({
    forward: 0,
    strafe: 0,
    vertical: 0,
  });

  const clearStatus = useCallback(() => setStatus(null), []);
  const handleError = useCallback(
    (message: string) => {
      setStatus(null);
      onError?.(message);
    },
    [onError],
  );

  const rotation = useMemo<[number, number, number]>(
    () => [
      orientation.x * DEG_TO_RAD,
      orientation.y * DEG_TO_RAD,
      orientation.z * DEG_TO_RAD,
    ],
    [orientation],
  );

  useEffect(() => {
    if (kind === "unsupported") {
      onError?.(`Unsupported 3D format: ${media.name}`);
    }
  }, [kind, media.name, onError]);

  useEffect(() => {
    writeStoredView(storageKey, { mode, orientation });
  }, [mode, orientation, storageKey]);

  useEffect(() => {
    writeWalkSettings(walkSettings);
  }, [walkSettings]);

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

  const hintText =
    mode === "walk"
      ? coarsePointer
        ? "Drag to look · joystick to move · ↑/↓ for height"
        : "Drag to look · W/A/S/D move · Q/E height · scroll forward/back"
      : coarsePointer
        ? "One finger orbit · pinch to zoom · two fingers to pan"
        : "Drag to orbit · scroll or pinch to zoom · right-drag to pan";

  const hintMaxWidth =
    mode === "walk" && coarsePointer
      ? "calc(100% - 210px)"
      : "min(26rem, calc(100% - 24px))";

  const changeMode = (next: NavigationMode) => {
    if (next === mode) return;
    moveRef.current = { forward: 0, strafe: 0, vertical: 0 };
    setMode(next);
    setSettingsOpen(false);
    setHintVisible(true);
  };

  const rotateAxis = (axis: OrientationAxis, delta: number) => {
    setOrientation((current) => ({
      ...current,
      [axis]: normalizeDegrees(current[axis] + delta),
    }));
    setHintVisible(false);
  };

  const resetOrientation = () => {
    setOrientation({ ...ZERO_ORIENTATION });
    setHintVisible(false);
  };

  const setUprightOrientation = () => {
    setOrientation({ ...ZERO_ORIENTATION, x: 270 });
    setHintVisible(false);
  };

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
      onPointerDown={(event) => {
        if (event.target instanceof HTMLCanvasElement) {
          setHintVisible(false);
        }
      }}
      onDoubleClick={(event) => {
        if (event.target instanceof HTMLCanvasElement) {
          setResetToken((token) => token + 1);
        }
      }}
    >
      <Canvas
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        fallback={
          <div
            aria-hidden="true"
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
        <CameraRig kind={kind} mode={mode} resetToken={resetToken} />
        <WalkControls
          active={mode === "walk"}
          moveRef={moveRef}
          resetToken={resetToken}
          speed={walkSettings.speed}
          lookSensitivity={walkSettings.lookSensitivity}
        />
        <SceneErrorBoundary onError={handleError}>
          <Suspense fallback={null}>
            {kind === "model" ? (
              <ModelScene
                src={media.src}
                onReady={clearStatus}
                rotation={rotation}
              />
            ) : (
              <SplatScene
                src={media.src}
                rotation={rotation}
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

      <div
        role="group"
        aria-label="Viewer controls"
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <div role="group" aria-label="Navigation mode" style={{ display: "flex" }}>
          <button
            type="button"
            aria-pressed={mode === "orbit"}
            onClick={() => changeMode("orbit")}
            style={{
              ...controlButtonStyle(mode === "orbit"),
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            Orbit
          </button>
          <button
            type="button"
            aria-pressed={mode === "walk"}
            onClick={() => changeMode("walk")}
            style={{
              ...controlButtonStyle(mode === "walk"),
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              marginLeft: -1,
            }}
          >
            Walk
          </button>
        </div>
        <button
          type="button"
          aria-label="Rotate view"
          aria-expanded={orientationOpen}
          aria-controls="spatial-orientation-panel"
          onClick={() => {
            setSettingsOpen(false);
            setOrientationOpen((open) => !open);
          }}
          style={controlButtonStyle(orientationOpen)}
        >
          Rotate
        </button>
        {mode === "walk" && (
          <button
            type="button"
            aria-label="Walk settings"
            title="Walk settings"
            aria-expanded={settingsOpen}
            aria-controls="spatial-walk-settings-panel"
            onClick={() => {
              setOrientationOpen(false);
              setSettingsOpen((open) => !open);
            }}
            style={{
              ...controlButtonStyle(settingsOpen),
              width: 44,
              padding: 0,
              fontSize: 15,
            }}
          >
            ⚙
          </button>
        )}
      </div>

      {orientationOpen && (
        <div
          id="spatial-orientation-panel"
          role="group"
          aria-label="Orientation controls"
          style={{
            position: "absolute",
            top: 64,
            left: 12,
            zIndex: 4,
            width: 258,
            maxHeight: "calc(100% - 76px)",
            overflowY: "auto",
            padding: 10,
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 10,
            background: "rgba(17, 17, 17, 0.94)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              marginBottom: 8,
              color: "#bbb",
              fontSize: 11,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Rotate 90°
          </div>
          {(["x", "y", "z"] as const).map((axis) => (
            <div
              key={axis}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 16,
                  color: "#9cc4ff",
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {axis.toUpperCase()}
              </span>
              <button
                type="button"
                aria-label={`Rotate ${axis.toUpperCase()} minus 90 degrees`}
                onClick={() => rotateAxis(axis, -ORIENTATION_STEP)}
                style={orientationButtonStyle()}
              >
                −90°
              </button>
              <button
                type="button"
                aria-label={`Rotate ${axis.toUpperCase()} plus 90 degrees`}
                onClick={() => rotateAxis(axis, ORIENTATION_STEP)}
                style={orientationButtonStyle()}
              >
                +90°
              </button>
              <span
                style={{
                  marginLeft: "auto",
                  color: "#aaa",
                  fontFamily: "monospace",
                  fontSize: 11,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {orientation[axis]}°
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={setUprightOrientation}
            style={{
              ...controlButtonStyle(false),
              width: "100%",
              marginBottom: 6,
            }}
          >
            Z-up → Y-up (X 270°)
          </button>
          <button
            type="button"
            onClick={resetOrientation}
            style={{
              ...controlButtonStyle(false),
              width: "100%",
            }}
          >
            Reset orientation
          </button>
        </div>
      )}

      {settingsOpen && mode === "walk" && (
        <div
          id="spatial-walk-settings-panel"
          role="group"
          aria-label="Walk settings"
          style={{
            position: "absolute",
            top: 64,
            left: 12,
            zIndex: 4,
            width: 258,
            maxHeight: "calc(100% - 76px)",
            overflowY: "auto",
            padding: 12,
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 10,
            background: "rgba(17, 17, 17, 0.94)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              marginBottom: 10,
              color: "#bbb",
              fontSize: 11,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Walk controls
          </div>
          <label
            style={{
              display: "grid",
              gap: 6,
              marginBottom: 12,
              color: "#ddd",
              fontSize: 12,
            }}
          >
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>Move speed</span>
              <span style={{ color: "#9cc4ff" }}>
                {walkSettings.speed.toFixed(1)}
              </span>
            </span>
            <input
              type="range"
              min={SPEED_RANGE.min}
              max={SPEED_RANGE.max}
              step={SPEED_RANGE.step}
              value={walkSettings.speed}
              onChange={(event) =>
                setWalkSettings((current) => ({
                  ...current,
                  speed: Number(event.target.value),
                }))
              }
              style={{ width: "100%", accentColor: "#6ea8fe" }}
            />
          </label>
          <label
            style={{
              display: "grid",
              gap: 6,
              marginBottom: 12,
              color: "#ddd",
              fontSize: 12,
            }}
          >
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>Look sensitivity</span>
              <span style={{ color: "#9cc4ff" }}>
                {walkSettings.lookSensitivity.toFixed(2)}×
              </span>
            </span>
            <input
              type="range"
              min={LOOK_RANGE.min}
              max={LOOK_RANGE.max}
              step={LOOK_RANGE.step}
              value={walkSettings.lookSensitivity}
              onChange={(event) =>
                setWalkSettings((current) => ({
                  ...current,
                  lookSensitivity: Number(event.target.value),
                }))
              }
              style={{ width: "100%", accentColor: "#6ea8fe" }}
            />
          </label>
          <button
            type="button"
            onClick={() => setWalkSettings({ ...DEFAULT_WALK_SETTINGS })}
            style={{
              ...controlButtonStyle(false),
              width: "100%",
            }}
          >
            Reset defaults
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label="Reset 3D view"
        aria-keyshortcuts="R"
        title="Reset view (R)"
        onClick={() => setResetToken((token) => token + 1)}
        style={{
          ...controlButtonStyle(false),
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 4,
        }}
      >
        Reset
      </button>

      {mode === "walk" && coarsePointer && (
        <>
          <WalkJoystick moveRef={moveRef} />
          <WalkHeightControls moveRef={moveRef} />
        </>
      )}

      {hintVisible ? (
        <div
          id="spatial-controls-hint"
          style={{
            position: "absolute",
            left: 12,
            bottom: "max(12px, env(safe-area-inset-bottom))",
            zIndex: 2,
            maxWidth: hintMaxWidth,
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
            ...controlButtonStyle(false),
            position: "absolute",
            left: 12,
            bottom: "max(12px, env(safe-area-inset-bottom))",
            zIndex: 2,
            width: 44,
            height: 44,
            minHeight: 44,
            padding: 0,
            borderRadius: "50%",
            fontSize: 15,
          }}
        >
          ?
        </button>
      )}
    </div>
  );
}

function orientationButtonStyle() {
  return {
    minHeight: 44,
    minWidth: 48,
    padding: "0 6px",
    border: "1px solid #333",
    borderRadius: 6,
    background: "#1a1a1a",
    color: "#ddd",
    fontFamily: "system-ui, sans-serif",
    fontSize: 11,
    cursor: "pointer",
  };
}

function CameraRig({
  kind,
  mode,
  resetToken,
}: {
  kind: RenderableKind;
  mode: NavigationMode;
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

  useEffect(() => {
    if (mode !== "orbit") return;

    const controls = controlsRef.current;
    if (!controls) return;

    // Preserve the view when returning from Walk: orbit around a point in
    // front of the current camera instead of snapping back to the origin.
    const forward = new Vector3();
    camera.getWorldDirection(forward);
    const center =
      kind === "model" ? new Vector3(0, 1.05, 0) : new Vector3(0, 1.15, 0);
    const distance = Math.min(
      6,
      Math.max(2, camera.position.distanceTo(center)),
    );

    controls.target
      .copy(camera.position)
      .addScaledVector(forward, distance);
    controls.update();
  }, [camera, kind, mode]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={mode === "orbit"}
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
  rotation,
}: {
  src: string;
  onReady: () => void;
  rotation: [number, number, number];
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
      -center.y * scale,
      -center.z * scale,
    );
    return clone;
  }, [scene]);

  return (
    <group>
      <group position={[0, 1.1, 0]} rotation={rotation}>
        <primitive object={object} />
      </group>
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
