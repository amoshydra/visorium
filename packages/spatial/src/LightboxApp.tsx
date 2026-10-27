import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
import {
  Box3,
  DoubleSide,
  MathUtils,
  MOUSE,
  Raycaster,
  Sphere,
  Vector2,
  Vector3,
  type Group,
  type Material,
  type Mesh,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  FlyControls,
  FlyHeightControls,
  FlyJoystick,
  type MoveInput,
  type NavigationMode,
} from "./NavigationControls.js";
import {
  DEFAULT_VIEWER_SETTINGS,
  LOOK_RANGE,
  SPEED_RANGE,
  isEditableTarget,
  type ViewerSettings,
} from "./settings.js";

const SplatScene = lazy(() => import("./SplatScene.js"));

const HINT_HIDE_DELAY = 7_000;
const SPEED_NOTICE_DURATION = 1_400;
const ORIENTATION_STEP = 90;
const DEG_TO_RAD = Math.PI / 180;
const FOCUS_DURATION = 220;
const FOCUS_OBJECT_NAME = "spatial-content";
const FLY_TO_ORBIT_MIN_DISTANCE = 0.35;
const FLY_TO_ORBIT_MAX_DISTANCE = 1;
const FLY_TO_ORBIT_DISTANCE_FACTOR = 0.25;
const STORAGE_PREFIX = "visorium:spatial-view:";
const SETTINGS_STORAGE_KEY = "visorium:spatial-settings:v1";
const DEFAULT_Z_UP_STORAGE_KEY = "visorium:spatial-default-zup:v1";
const GUIDE_FADE_IN = 0.15;
const GUIDE_HOLD = 0.45;
const GUIDE_FADE_OUT = 1.3;
const ORBIT_MOUSE_BUTTONS = {
  LEFT: MOUSE.ROTATE,
  MIDDLE: MOUSE.PAN,
  RIGHT: MOUSE.PAN,
};
const TEMP_X_AXIS = new Vector3();
const TEMP_Y_AXIS = new Vector3();
const TEMP_PAN = new Vector3();

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
  orientation: Orientation | null;
}

const ZERO_ORIENTATION: Orientation = { x: 0, y: 0, z: 0 };

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
    if (!raw) return { orientation: null };

    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") {
      return { orientation: null };
    }

    const candidate = value as Record<string, unknown>;
    return {
      // "walk" was the previous name for fly; migrate saved views.
      mode:
        candidate.mode === "walk" || candidate.mode === "fly"
          ? "fly"
          : candidate.mode === "orbit"
            ? "orbit"
            : undefined,
      orientation: candidate.orientation
        ? readOrientation(candidate.orientation)
        : null,
    };
  } catch {
    return { orientation: null };
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

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const readViewerSettings = (): ViewerSettings => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VIEWER_SETTINGS };

    const value = JSON.parse(raw) as Record<string, unknown>;
    return {
      speed:
        clampSetting(
          value.speed,
          SPEED_RANGE.min,
          SPEED_RANGE.max,
        ) ?? DEFAULT_VIEWER_SETTINGS.speed,
      lookSensitivity:
        clampSetting(
          value.lookSensitivity,
          LOOK_RANGE.min,
          LOOK_RANGE.max,
        ) ?? DEFAULT_VIEWER_SETTINGS.lookSensitivity,
      zoomToCursor: readBoolean(
        value.zoomToCursor,
        DEFAULT_VIEWER_SETTINGS.zoomToCursor,
      ),
    };
  } catch {
    return { ...DEFAULT_VIEWER_SETTINGS };
  }
};

const writeViewerSettings = (settings: ViewerSettings) => {
  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Storage can be unavailable in private browsing or when full.
  }
};

const readDefaultZUp = () => {
  try {
    return window.localStorage.getItem(DEFAULT_Z_UP_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeDefaultZUp = (enabled: boolean) => {
  try {
    window.localStorage.setItem(DEFAULT_Z_UP_STORAGE_KEY, enabled ? "1" : "0");
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

const settingsLabelStyle = {
  display: "grid",
  gap: 6,
  marginBottom: 12,
  color: "#ddd",
  fontSize: 12,
} as const;

const settingsValueStyle = { color: "#9cc4ff" } as const;

const settingsNoteStyle = {
  margin: "0 0 12px",
  color: "#8f8f8f",
  fontSize: 11,
  lineHeight: 1.4,
} as const;

const settingsCheckboxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 4,
  color: "#ddd",
  fontSize: 12,
  lineHeight: 1.35,
  cursor: "pointer",
} as const;

export function LightboxApp({ media, onError, onReady }: LightboxAppProps) {
  const kind = getKind(media.name);
  const storageKey = useMemo(
    () => getStorageKey(media.name, media.mtime),
    [media.name, media.mtime],
  );
  const [storedView] = useState(() => readStoredView(storageKey));
  const [zUpDefault, setZUpDefault] = useState(readDefaultZUp);
  const [status, setStatus] = useState<string | null>(() =>
    getLoadingStatus(kind),
  );
  const [resetToken, setResetToken] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const isPly = /\.ply$/i.test(media.name);
  const [orientation, setOrientation] = useState<Orientation>(() => {
    if (storedView.orientation) return storedView.orientation;
    if (isPly && zUpDefault) return { ...ZERO_ORIENTATION, x: 270 };
    return { ...ZERO_ORIENTATION };
  });
  const [mode, setMode] = useState<NavigationMode>(
    () => storedView.mode ?? "orbit",
  );
  const [orientationOpen, setOrientationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] =
    useState<ViewerSettings>(readViewerSettings);
  const [focusToken, setFocusToken] = useState(0);
  const [speedNotice, setSpeedNotice] = useState<{
    speed: number;
    key: number;
  } | null>(null);
  const [guideTarget, setGuideTarget] = useState<Vector3 | null>(null);
  const previousMode = useRef<NavigationMode | null>(null);
  const speedNoticeKey = useRef(0);
  const orbitTargetRef = useRef(new Vector3(0, 1.1, 0));
  const moveRef = useRef<MoveInput>({
    forward: 0,
    strafe: 0,
    vertical: 0,
  });

  const clearStatus = useCallback(() => setStatus(null), []);
  const clearGuide = useCallback(() => setGuideTarget(null), []);
  const resetView = useCallback(() => {
    setResetToken((token) => token + 1);
    setHintVisible(false);
  }, []);
  const focusView = useCallback(() => {
    setFocusToken((token) => token + 1);
    setHintVisible(false);
  }, []);
  const handleSpeedChange = useCallback((nextSpeed: number) => {
    setSettings((current) =>
      current.speed === nextSpeed
        ? current
        : { ...current, speed: nextSpeed },
    );
    setSpeedNotice({
      speed: nextSpeed,
      key: ++speedNoticeKey.current,
    });
    setHintVisible(false);
  }, []);
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
    writeViewerSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!speedNotice) return;
    const timeout = window.setTimeout(
      () => setSpeedNotice(null),
      SPEED_NOTICE_DURATION,
    );
    return () => window.clearTimeout(timeout);
  }, [speedNotice]);

  useEffect(() => {
    writeDefaultZUp(zUpDefault);
  }, [zUpDefault]);

  useEffect(() => {
    const previous = previousMode.current;
    previousMode.current = mode;

    if (previous === null || previous === mode) return;

    const frame = requestAnimationFrame(() => {
      setGuideTarget(orbitTargetRef.current.clone());
    });

    return () => cancelAnimationFrame(frame);
  }, [mode]);

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
        event.altKey ||
        event.repeat ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        resetView();
        return;
      }

      if (key === "f" && mode === "orbit") {
        event.preventDefault();
        focusView();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusView, mode, resetView]);

  if (kind === "unsupported") {
    return null;
  }

  const hintText =
    mode === "fly"
      ? coarsePointer
        ? "Left joystick flies · drag to look · ↑/↓ altitude"
        : "Drag to look · W/A/S/D fly in look direction · Q/E altitude · scroll speed · Shift boost"
      : coarsePointer
        ? "One finger orbit · pinch to zoom · two-finger pan · double-tap to focus"
        : "Drag to orbit · scroll to zoom · right-drag or Shift+scroll to pan · double-click to focus";

  const hintMaxWidth = "min(32rem, calc(100% - 24px))";
  const hintBottom =
    mode === "fly" && coarsePointer
      ? "calc(118px + env(safe-area-inset-bottom))"
      : "max(12px, env(safe-area-inset-bottom))";
  const panelTop = coarsePointer ? 118 : 64;
  const panelMaxHeight = `calc(100% - ${panelTop + 12}px)`;

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
        <CameraRig
          kind={kind}
          mode={mode}
          resetToken={resetToken}
          targetRef={orbitTargetRef}
          focusToken={focusToken}
          zoomToCursor={settings.zoomToCursor}
        />
        <FlyControls
          active={mode === "fly"}
          moveRef={moveRef}
          resetToken={resetToken}
          speed={settings.speed}
          lookSensitivity={settings.lookSensitivity}
          onSpeedChange={handleSpeedChange}
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
        <TransitionGuide target={guideTarget} onComplete={clearGuide} />
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
          maxWidth: "calc(100% - 100px)",
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
            aria-pressed={mode === "fly"}
            onClick={() => changeMode("fly")}
            style={{
              ...controlButtonStyle(mode === "fly"),
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              marginLeft: -1,
            }}
          >
            Fly
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
        {mode === "orbit" && (
          <button
            type="button"
            aria-label="Focus 3D view"
            aria-keyshortcuts="F"
            title="Focus view (F)"
            onClick={focusView}
            style={controlButtonStyle(false)}
          >
            Focus
          </button>
        )}
        <button
          type="button"
          aria-label="Viewer settings"
          title="Viewer settings"
          aria-expanded={settingsOpen}
          aria-controls="spatial-viewer-settings-panel"
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
      </div>

      {orientationOpen && (
        <div
          id="spatial-orientation-panel"
          role="group"
          aria-label="Orientation controls"
          style={{
            position: "absolute",
            top: panelTop,
            left: 12,
            zIndex: 4,
            width: 258,
            maxHeight: panelMaxHeight,
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
          {isPly && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                color: "#aaa",
                fontSize: 11,
                lineHeight: 1.35,
                cursor: "pointer",
              }}
            >
              <input
                id="spatial-default-z-up"
                name="defaultZUp"
                type="checkbox"
                checked={zUpDefault}
                onChange={(event) => setZUpDefault(event.target.checked)}
                style={{ accentColor: "#6ea8fe" }}
              />
              Default new PLY files to Z-up
            </label>
          )}
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

      {settingsOpen && (
        <div
          id="spatial-viewer-settings-panel"
          role="group"
          aria-label="Viewer settings"
          style={{
            position: "absolute",
            top: panelTop,
            left: 12,
            zIndex: 4,
            width: 258,
            maxHeight: panelMaxHeight,
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
            {mode === "orbit" ? "Orbit controls" : "Fly controls"}
          </div>

          {mode === "orbit" ? (
            <>
              <label style={settingsCheckboxStyle}>
                <input
                  id="spatial-zoom-to-cursor"
                  name="zoomToCursor"
                  type="checkbox"
                  checked={settings.zoomToCursor}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      zoomToCursor: event.target.checked,
                    }))
                  }
                  style={{ accentColor: "#6ea8fe" }}
                />
                Zoom toward cursor
              </label>
              <p style={settingsNoteStyle}>
                Wheel zoom follows the pointer. Shift+scroll or middle-drag
                pans.
              </p>
            </>
          ) : (
            <>
              <label style={settingsLabelStyle}>
                <span
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>Fly speed</span>
                  <span style={settingsValueStyle}>
                    {settings.speed.toFixed(1)}×
                  </span>
                </span>
                <input
                  id="spatial-fly-speed"
                  name="flySpeed"
                  type="range"
                  min={SPEED_RANGE.min}
                  max={SPEED_RANGE.max}
                  step={SPEED_RANGE.step}
                  value={settings.speed}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      speed: Number(event.target.value),
                    }))
                  }
                  style={{ width: "100%", accentColor: "#6ea8fe" }}
                />
              </label>
              <label style={settingsLabelStyle}>
                <span
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>Look sensitivity</span>
                  <span style={settingsValueStyle}>
                    {settings.lookSensitivity.toFixed(2)}×
                  </span>
                </span>
                <input
                  id="spatial-look-sensitivity"
                  name="lookSensitivity"
                  type="range"
                  min={LOOK_RANGE.min}
                  max={LOOK_RANGE.max}
                  step={LOOK_RANGE.step}
                  value={settings.lookSensitivity}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      lookSensitivity: Number(event.target.value),
                    }))
                  }
                  style={{ width: "100%", accentColor: "#6ea8fe" }}
                />
              </label>
              <p style={settingsNoteStyle}>
                Fly moves in the direction you look. Q/E and the altitude
                buttons change altitude. There is no collision detection.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setSettings({ ...DEFAULT_VIEWER_SETTINGS });
            }}
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
        onClick={resetView}
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

      {mode === "fly" && coarsePointer && <FlyJoystick moveRef={moveRef} />}
      {mode === "fly" && coarsePointer && (
        <FlyHeightControls moveRef={moveRef} />
      )}

      {speedNotice && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            left: "50%",
            bottom: "max(12px, env(safe-area-inset-bottom))",
            zIndex: 3,
            transform: "translateX(-50%)",
            padding: "6px 10px",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 999,
            background: "rgba(17, 17, 17, 0.82)",
            color: "#dcecff",
            fontFamily: "system-ui, sans-serif",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            pointerEvents: "none",
          }}
        >
          Speed {speedNotice.speed.toFixed(1)}×
        </div>
      )}

      {hintVisible ? (
        <div
          id="spatial-controls-hint"
          style={{
            position: "absolute",
            left: 12,
            bottom: hintBottom,
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
            bottom: hintBottom,
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

interface FocusAnimation {
  fromTarget: Vector3;
  toTarget: Vector3;
  fromPosition: Vector3;
  toPosition: Vector3;
  start: number;
}

function CameraRig({
  kind,
  mode,
  resetToken,
  targetRef,
  focusToken,
  zoomToCursor,
}: {
  kind: RenderableKind;
  mode: NavigationMode;
  resetToken: number;
  targetRef: { current: Vector3 };
  focusToken: number;
  zoomToCursor: boolean;
}) {
  const { camera, gl, scene } = useThree();
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const focusAnimation = useRef<FocusAnimation | null>(null);
  const focusTarget = useRef(new Vector3());
  const handledFocusToken = useRef(0);

  const getContentBox = useCallback(() => {
    const content = scene.getObjectByName(FOCUS_OBJECT_NAME);
    if (!content) return null;

    const box = new Box3().setFromObject(content);
    return box.isEmpty() ? null : box;
  }, [scene]);

  const cancelFocus = useCallback(() => {
    if (!focusAnimation.current) return;

    focusAnimation.current = null;
    const controls = controlsRef.current;
    if (controls) {
      controls.enabled = mode === "orbit";
    }
  }, [mode]);

  const animateFocus = useCallback(
    (toTarget: Vector3, toPosition: Vector3) => {
      const controls = controlsRef.current;
      if (!controls) return;

      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        controls.target.copy(toTarget);
        camera.position.copy(toPosition);
        camera.lookAt(toTarget);
        targetRef.current.copy(toTarget);
        controls.enabled = mode === "orbit";
        controls.update();
        return;
      }

      focusAnimation.current = {
        fromTarget: controls.target.clone(),
        toTarget: toTarget.clone(),
        fromPosition: camera.position.clone(),
        toPosition: toPosition.clone(),
        start: performance.now(),
      };
      if (mode === "orbit") {
        controls.enabled = false;
      }
    },
    [camera, mode, targetRef],
  );

  const focusAll = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const box = getContentBox();
    const center = box
      ? box.getCenter(new Vector3())
      : new Vector3(0, 1.1, 0);
    const sphere = box
      ? box.getBoundingSphere(new Sphere())
      : new Sphere(center, 1.2);
    const radius =
      Number.isFinite(sphere.radius) && sphere.radius > 0
        ? sphere.radius
        : 1.2;
    const fov = MathUtils.degToRad("fov" in camera ? camera.fov : 50);
    const distance = MathUtils.clamp(
      (radius / Math.sin(fov / 2)) * 1.1,
      1.5,
      9,
    );
    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-6) {
      direction.set(0, 0, 1);
    }
    direction.normalize();

    animateFocus(
      center,
      center.clone().addScaledVector(direction, distance),
    );
  }, [animateFocus, camera, getContentBox]);

  const focusAt = useCallback(
    (clientX: number, clientY: number) => {
      const controls = controlsRef.current;
      if (!controls) return;

      const content = scene.getObjectByName(FOCUS_OBJECT_NAME);
      const rect = gl.domElement.getBoundingClientRect();
      if (!content || rect.width === 0 || rect.height === 0) {
        focusAll();
        return;
      }

      const pointer = new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(content, true);
      const hit = intersections.find((intersection) =>
        Number.isFinite(intersection.distance),
      );

      if (!hit) {
        focusAll();
        return;
      }

      const toTarget = hit.point.clone();
      const distance = MathUtils.clamp(
        camera.position.distanceTo(toTarget) * 0.8,
        0.5,
        4,
      );
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 1e-6) {
        direction.copy(camera.position).sub(toTarget);
      }
      if (direction.lengthSq() < 1e-6) {
        direction.set(0, 0, 1);
      }
      direction.normalize();

      animateFocus(
        toTarget,
        toTarget.clone().addScaledVector(direction, distance),
      );
    },
    [animateFocus, camera, focusAll, gl, scene],
  );

  useEffect(() => {
    const target =
      kind === "model" ? new Vector3(0, 1.05, 0) : new Vector3(0, 1.15, 0);
    const position =
      kind === "model" ? new Vector3(0, 1.6, 4.4) : new Vector3(0, 1.5, 3);

    camera.position.copy(position);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    targetRef.current.copy(target);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
  }, [camera, kind, resetToken, targetRef]);

  useEffect(() => {
    focusAnimation.current = null;
    const controls = controlsRef.current;
    if (controls) {
      controls.enabled = mode === "orbit";
    }
  }, [mode, resetToken]);

  useEffect(() => {
    if (mode !== "orbit") return;

    const controls = controlsRef.current;
    if (!controls) return;

    // Preserve the view when leaving Fly. The content is normalized to
    // roughly two world units, so the pivot must stay close to the camera;
    // a distance based on the model center can put the pivot outside an
    // interior and make it feel like the orbit is around the whole building.
    const forward = new Vector3();
    camera.getWorldDirection(forward);
    const center =
      kind === "model" ? new Vector3(0, 1.05, 0) : new Vector3(0, 1.15, 0);
    const distance = MathUtils.clamp(
      camera.position.distanceTo(center) * FLY_TO_ORBIT_DISTANCE_FACTOR,
      FLY_TO_ORBIT_MIN_DISTANCE,
      FLY_TO_ORBIT_MAX_DISTANCE,
    );

    controls.target
      .copy(camera.position)
      .addScaledVector(forward, distance);
    targetRef.current.copy(controls.target);
    controls.update();
  }, [camera, kind, mode, targetRef]);

  useEffect(() => {
    if (
      focusToken === 0 ||
      focusToken === handledFocusToken.current
    ) {
      return;
    }

    handledFocusToken.current = focusToken;
    if (mode === "orbit") {
      focusAll();
    }
  }, [focusAll, focusToken, mode]);

  useEffect(() => {
    if (mode !== "orbit") return;

    const canvas = gl.domElement;
    let lastFocusAt = 0;
    let tapState: {
      pointerId: number;
      x: number;
      y: number;
      time: number;
      moved: boolean;
    } | null = null;
    let lastTap: { x: number; y: number; time: number } | null = null;

    const handleDoubleClick = (event: MouseEvent) => {
      const now = performance.now();
      if (now - lastFocusAt < 350) return;

      lastFocusAt = now;
      focusAt(event.clientX, event.clientY);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      if (tapState) {
        tapState.moved = true;
        return;
      }

      tapState = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        moved: false,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const tap = tapState;
      if (!tap || tap.pointerId !== event.pointerId) return;
      if (
        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12
      ) {
        tap.moved = true;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const tap = tapState;
      if (!tap || tap.pointerId !== event.pointerId) return;

      tapState = null;
      if (tap.moved) return;

      const now = performance.now();
      if (
        lastTap &&
        now - lastTap.time < 320 &&
        Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <
          24
      ) {
        lastTap = null;
        if (now - lastFocusAt >= 350) {
          lastFocusAt = now;
          focusAt(event.clientX, event.clientY);
        }
        return;
      }

      lastTap = {
        x: event.clientX,
        y: event.clientY,
        time: now,
      };
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (tapState?.pointerId === event.pointerId) {
        tapState = null;
      }
    };

    canvas.addEventListener("dblclick", handleDoubleClick);
    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      canvas.removeEventListener("dblclick", handleDoubleClick);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [focusAt, gl, mode]);

  useEffect(() => {
    if (mode !== "orbit") return;

    const canvas = gl.domElement;
    const handleWheel = (event: WheelEvent) => {
      if (
        !event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target !== canvas
      ) {
        return;
      }

      const controls = controlsRef.current;
      const rect = canvas.getBoundingClientRect();
      if (!controls || rect.width === 0 || rect.height === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      cancelFocus();

      const distance = camera.position.distanceTo(controls.target);
      const scale =
        (2 *
          distance *
          Math.tan(
            MathUtils.degToRad(
              ("fov" in camera ? camera.fov : 50) / 2,
            ),
          )) /
        rect.height;
      TEMP_X_AXIS.setFromMatrixColumn(camera.matrix, 0);
      TEMP_Y_AXIS.setFromMatrixColumn(camera.matrix, 1);
      TEMP_PAN.set(0, 0, 0)
        .addScaledVector(TEMP_X_AXIS, -event.deltaX * scale)
        .addScaledVector(TEMP_Y_AXIS, event.deltaY * scale);

      controls.target.add(TEMP_PAN);
      camera.position.add(TEMP_PAN);
      targetRef.current.copy(controls.target);
      controls.update();
    };

    window.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", handleWheel, true);
    };
  }, [camera, cancelFocus, gl, mode, targetRef]);

  useFrame(() => {
    const animation = focusAnimation.current;
    if (!animation) return;

    const progress = Math.min(
      1,
      (performance.now() - animation.start) / FOCUS_DURATION,
    );
    const eased = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(
      animation.fromPosition,
      animation.toPosition,
      eased,
    );
    focusTarget.current.lerpVectors(
      animation.fromTarget,
      animation.toTarget,
      eased,
    );
    camera.lookAt(focusTarget.current);
    targetRef.current.copy(focusTarget.current);

    if (progress >= 1) {
      focusAnimation.current = null;
      const controls = controlsRef.current;
      if (controls) {
        controls.target.copy(animation.toTarget);
        controls.enabled = mode === "orbit";
        controls.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={mode === "orbit"}
      enablePan
      enableDamping
      minDistance={0.2}
      maxDistance={12}
      mouseButtons={ORBIT_MOUSE_BUTTONS}
      zoomToCursor={zoomToCursor}
      onChange={() => {
        if (controlsRef.current) {
          targetRef.current.copy(controlsRef.current.target);
        }
      }}
    />
  );
}

function TransitionGuide({
  target,
  onComplete,
}: {
  target: Vector3 | null;
  onComplete: () => void;
}) {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const elapsed = useRef(0);
  const completed = useRef(false);

  useEffect(() => {
    elapsed.current = 0;
    completed.current = false;
  }, [target]);

  useFrame((_, delta) => {
    if (!target || completed.current) return;

    elapsed.current += Math.min(delta, 0.1);
    const fadeInEnd = GUIDE_FADE_IN;
    const holdEnd = fadeInEnd + GUIDE_HOLD;
    const total = holdEnd + GUIDE_FADE_OUT;
    const fade =
      elapsed.current < fadeInEnd
        ? elapsed.current / fadeInEnd
        : elapsed.current < holdEnd
          ? 1
          : Math.max(0, 1 - (elapsed.current - holdEnd) / GUIDE_FADE_OUT);

    groupRef.current?.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.material) return;

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        const candidate = material as Material & {
          opacity: number;
          transparent: boolean;
          needsUpdate: boolean;
          userData: { baseOpacity?: number };
        };

        if (candidate.userData.baseOpacity === undefined) {
          candidate.userData.baseOpacity = candidate.opacity;
        }
        if (!candidate.transparent) {
          candidate.transparent = true;
          candidate.needsUpdate = true;
        }
        candidate.opacity =
          (candidate.userData.baseOpacity ?? 1) * fade;
      }
    });

    if (elapsed.current >= total) {
      completed.current = true;
      onComplete();
    }
  });

  if (!target) return null;

  // Keep the pivot gizmo readable at any orbit radius. A fixed world-size
  // marker becomes enormous when the nearby indoor pivot is only a fraction
  // of a unit from the camera.
  const markerScale = MathUtils.clamp(
    camera.position.distanceTo(target) / 2,
    0.2,
    1,
  );

  return (
    <group ref={groupRef}>
      <mesh
        position={[target.x, 0.012, target.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={20}
      >
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial
          color="#5b8fca"
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      </mesh>
      <gridHelper
        args={[6, 12, "#5b8fca", "#26384d"]}
        position={[target.x, 0.02, target.z]}
      />
      {target.y > 0.02 && (
        <mesh
          position={[target.x, target.y / 2, target.z]}
          renderOrder={20}
        >
          <cylinderGeometry
            args={[
              0.008 * markerScale,
              0.008 * markerScale,
              target.y,
              8,
            ]}
          />
          <meshBasicMaterial
            color="#7fb6ef"
            transparent
            opacity={0.55}
            depthTest={false}
          />
        </mesh>
      )}
      <mesh
        position={[target.x, target.y, target.z]}
        scale={markerScale}
        renderOrder={20}
      >
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#ffe29a" depthTest={false} />
      </mesh>
      <mesh
        position={[target.x, target.y, target.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={markerScale}
        renderOrder={20}
      >
        <ringGeometry args={[0.14, 0.17, 32]} />
        <meshBasicMaterial
          color="#ffd166"
          transparent
          opacity={0.95}
          side={DoubleSide}
          depthTest={false}
        />
      </mesh>
    </group>
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
      <group
        name="spatial-content"
        position={[0, 1.1, 0]}
        rotation={rotation}
      >
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
