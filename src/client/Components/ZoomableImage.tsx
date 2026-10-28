import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import css from "./ZoomableImage.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const DOUBLE_TAP_ZOOM = 2.5;
const TAP_MOVE_THRESHOLD = 8;
const TAP_DURATION = 400;
const DOUBLE_TAP_WINDOW = 320;
const DOUBLE_TAP_DISTANCE = 24;
const SWIPE_X_THRESHOLD = 45;
const SWIPE_Y_THRESHOLD = 80;
const WHEEL_ZOOM_SPEED = 0.0015;

interface Point {
  x: number;
  y: number;
}

interface ViewState {
  zoom: number;
  pan: Point;
}

interface NaturalSize {
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

type Gesture =
  | {
      kind: "pan";
      pointerId: number;
      startX: number;
      startY: number;
      startPan: Point;
    }
  | {
      kind: "swipe";
      pointerId: number;
      startX: number;
      startY: number;
    }
  | {
      kind: "pinch";
      startDistance: number;
      startMid: Point;
      startZoom: number;
      startPan: Point;
    }
  | null;

interface TapState {
  pointerId: number;
  startX: number;
  startY: number;
  time: number;
  moved: boolean;
}

export interface ZoomableImageProps {
  src: string;
  alt: string;
  placeholderSrc?: string;
  onLoad?: (width: number, height: number) => void;
  onError?: () => void;
  onNavigate: (offset: number) => void;
  onClose: () => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const distance = (a: Point, b: Point) =>
  Math.hypot(b.x - a.x, b.y - a.y);

const midpoint = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const ZoomableImage = ({
  src,
  alt,
  placeholderSrc,
  onLoad,
  onError,
  onNavigate,
  onClose,
}: ZoomableImageProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture>(null);
  const tap = useRef<TapState | null>(null);
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);
  const [natural, setNatural] = useState<NaturalSize>({
    width: 0,
    height: 0,
  });
  const [viewport, setViewport] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [view, setView] = useState<ViewState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  const viewRef = useRef(view);

  const clampPan = useCallback(
    (pan: Point, zoom: number): Point => {
      if (
        natural.width <= 0 ||
        natural.height <= 0 ||
        viewport.width <= 0 ||
        viewport.height <= 0
      ) {
        return { x: 0, y: 0 };
      }

      const aspect = natural.width / natural.height;
      let baseWidth = viewport.width;
      let baseHeight = baseWidth / aspect;
      if (baseHeight > viewport.height) {
        baseHeight = viewport.height;
        baseWidth = baseHeight * aspect;
      }

      const maxX = Math.max(0, (baseWidth * zoom - viewport.width) / 2);
      const maxY = Math.max(0, (baseHeight * zoom - viewport.height) / 2);

      return {
        x: clamp(pan.x, -maxX, maxX),
        y: clamp(pan.y, -maxY, maxY),
      };
    },
    [natural, viewport],
  );

  const commitView = useCallback(
    (nextZoom: number, nextPan: Point) => {
      const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const next = {
        zoom,
        pan: zoom <= MIN_ZOOM ? { x: 0, y: 0 } : clampPan(nextPan, zoom),
      };
      viewRef.current = next;
      setView(next);
    },
    [clampPan],
  );

  const zoomAt = useCallback(
    (targetZoom: number, clientX: number, clientY: number) => {
      const viewportElement = viewportRef.current;
      if (!viewportElement) return;

      const current = viewRef.current;
      const zoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(zoom - current.zoom) < 0.0001) return;

      if (zoom <= MIN_ZOOM) {
        commitView(MIN_ZOOM, { x: 0, y: 0 });
        return;
      }

      const rect = viewportElement.getBoundingClientRect();
      const cursorX = clientX - rect.left - rect.width / 2;
      const cursorY = clientY - rect.top - rect.height / 2;
      const ratio = zoom / current.zoom;

      commitView(zoom, {
        x: current.pan.x * ratio + cursorX * (1 - ratio),
        y: current.pan.y * ratio + cursorY * (1 - ratio),
      });
    },
    [commitView],
  );

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return;

    const updateSize = () => {
      setViewport((current) => {
        const width = viewportElement.clientWidth;
        const height = viewportElement.clientHeight;
        return current.width === width && current.height === height
          ? current
          : { width, height };
      });
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewportElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const current = viewRef.current;
    commitView(current.zoom, current.pan);
  }, [commitView]);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();

      const current = viewRef.current;
      const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED);
      zoomAt(current.zoom * factor, event.clientX, event.clientY);
    };

    viewportElement.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    return () => viewportElement.removeEventListener("wheel", handleWheel);
  }, [zoomAt]);

  useEffect(() => {
    const resetGestures = () => {
      pointers.current.clear();
      tap.current = null;
      gesture.current = null;
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        resetGestures();
      }
    };

    window.addEventListener("blur", resetGestures);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", resetGestures);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleImageLoad = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth <= 0 || naturalHeight <= 0) return;

    setNatural({ width: naturalWidth, height: naturalHeight });
    onLoad?.(naturalWidth, naturalHeight);
  };

  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      const now = performance.now();
      const previous = lastTap.current;

      if (
        previous &&
        now - previous.time < DOUBLE_TAP_WINDOW &&
        Math.hypot(clientX - previous.x, clientY - previous.y) <
          DOUBLE_TAP_DISTANCE
      ) {
        lastTap.current = null;
        if (viewRef.current.zoom > MIN_ZOOM + 0.01) {
          commitView(MIN_ZOOM, { x: 0, y: 0 });
        } else {
          zoomAt(DOUBLE_TAP_ZOOM, clientX, clientY);
        }
        return;
      }

      lastTap.current = { x: clientX, y: clientY, time: now };
    },
    [commitView, zoomAt],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pointers.current.has(event.pointerId)) return;

    const pointer = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, pointer);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in every browser.
    }

    if (pointers.current.size === 1) {
      tap.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        time: performance.now(),
        moved: false,
      };

      if (viewRef.current.zoom > MIN_ZOOM + 0.01) {
        gesture.current = {
          kind: "pan",
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startPan: viewRef.current.pan,
        };
      } else if (event.pointerType !== "mouse") {
        gesture.current = {
          kind: "swipe",
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
      } else {
        gesture.current = null;
      }
      return;
    }

    if (pointers.current.size === 2) {
      const points = Array.from(pointers.current.values());
      tap.current = null;

      const startDistance = distance(points[0], points[1]);
      if (startDistance >= 1) {
        gesture.current = {
          kind: "pinch",
          startDistance,
          startMid: midpoint(points[0], points[1]),
          startZoom: viewRef.current.zoom,
          startPan: viewRef.current.pan,
        };
      } else {
        gesture.current = null;
      }
      return;
    }

    tap.current = null;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const tapState = tap.current;
    if (
      tapState?.pointerId === event.pointerId &&
      Math.hypot(
        event.clientX - tapState.startX,
        event.clientY - tapState.startY,
      ) > TAP_MOVE_THRESHOLD
    ) {
      tapState.moved = true;
    }

    const currentGesture = gesture.current;
    if (!currentGesture) return;

    if (currentGesture.kind === "pinch") {
      const points = Array.from(pointers.current.values());
      if (points.length < 2) return;

      const nextDistance = distance(points[0], points[1]);
      if (nextDistance < 1) return;

      const viewportElement = viewportRef.current;
      if (!viewportElement) return;

      const rect = viewportElement.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const nextMid = midpoint(points[0], points[1]);
      const zoom = clamp(
        currentGesture.startZoom *
          (nextDistance / currentGesture.startDistance),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const ratio = zoom / currentGesture.startZoom;
      const startMidX = currentGesture.startMid.x - rect.left - centerX;
      const startMidY = currentGesture.startMid.y - rect.top - centerY;
      const midX = nextMid.x - rect.left - centerX;
      const midY = nextMid.y - rect.top - centerY;

      commitView(zoom, {
        x: midX - ratio * (startMidX - currentGesture.startPan.x),
        y: midY - ratio * (startMidY - currentGesture.startPan.y),
      });
      return;
    }

    if (currentGesture.kind === "pan") {
      if (currentGesture.pointerId !== event.pointerId) return;

      commitView(viewRef.current.zoom, {
        x:
          currentGesture.startPan.x +
          (event.clientX - currentGesture.startX),
        y:
          currentGesture.startPan.y +
          (event.clientY - currentGesture.startY),
      });
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;

    const tapState = tap.current;
    const currentGesture = gesture.current;
    const wasTap =
      tapState?.pointerId === event.pointerId &&
      !tapState.moved &&
      performance.now() - tapState.time < TAP_DURATION;

    if (
      currentGesture?.kind === "swipe" &&
      currentGesture.pointerId === event.pointerId &&
      !wasTap
    ) {
      const dx = event.clientX - currentGesture.startX;
      const dy = event.clientY - currentGesture.startY;

      if (
        Math.abs(dx) > SWIPE_X_THRESHOLD &&
        Math.abs(dx) > Math.abs(dy) * 1.2
      ) {
        onNavigate(dx < 0 ? 1 : -1);
      } else if (
        dy > SWIPE_Y_THRESHOLD &&
        Math.abs(dy) > Math.abs(dx)
      ) {
        onClose();
      }
    } else if (wasTap) {
      handleTap(event.clientX, event.clientY);
    }

    pointers.current.delete(event.pointerId);
    tap.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already have been released.
    }

    if (currentGesture?.kind === "pinch") {
      const remaining = Array.from(pointers.current.entries());
      if (remaining.length === 1 && viewRef.current.zoom > MIN_ZOOM + 0.01) {
        const [pointerId, point] = remaining[0];
        gesture.current = {
          kind: "pan",
          pointerId,
          startX: point.x,
          startY: point.y,
          startPan: viewRef.current.pan,
        };
      } else {
        gesture.current = null;
      }
      return;
    }

    gesture.current = null;
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;

    pointers.current.delete(event.pointerId);
    tap.current = null;
    gesture.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already have been released.
    }
  };

  return (
    <div
      ref={viewportRef}
      className={css.viewport}
      style={{ cursor: view.zoom > MIN_ZOOM + 0.01 ? "grab" : "default" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      {placeholderSrc && (
        <img
          className={css.placeholder}
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      )}
      <img
        className={css.image}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={handleImageLoad}
        onError={onError}
        style={{
          transform: `translate3d(${view.pan.x}px, ${view.pan.y}px, 0) scale(${view.zoom})`,
        }}
      />
      {view.zoom > MIN_ZOOM + 0.01 && (
        <button
          type="button"
          className={css.zoomReset}
          aria-label={`Reset image zoom (${view.zoom.toFixed(1)} times)`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => commitView(MIN_ZOOM, { x: 0, y: 0 })}
        >
          {view.zoom.toFixed(1)}×
        </button>
      )}
    </div>
  );
};
