import { useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Euler, Vector3 } from "three";
import { SPEED_RANGE, isEditableTarget } from "./settings.js";

export type NavigationMode = "orbit" | "fly";

export interface MoveInput {
  forward: number;
  strafe: number;
  vertical: number;
}

export type MoveInputRef = { current: MoveInput };

const SPRINT_MULTIPLIER = 2.5;
const LOOK_SPEED = 0.0035;
const MAX_PITCH = Math.PI * 0.47;
const WHEEL_SPEED_THRESHOLD = 100;
const Y_AXIS = new Vector3(0, 1, 0);
const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);
const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
]);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function FlyControls({
  active,
  moveRef,
  resetToken,
  speed,
  lookSensitivity,
  onSpeedChange,
}: {
  active: boolean;
  moveRef: MoveInputRef;
  resetToken: number;
  speed: number;
  lookSensitivity: number;
  onSpeedChange?: (speed: number) => void;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const activePointerId = useRef<number | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const direction = useRef(new Vector3());
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const speedRef = useRef(speed);
  const wheelAccumulator = useRef(0);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    keys.current.clear();
    activePointerId.current = null;
    wheelAccumulator.current = 0;

    if (!active) return;

    const euler = new Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yaw.current = euler.y;
    pitch.current = euler.x;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
  }, [active, camera, resetToken]);

  useEffect(() => {
    if (!active) return;

    const pressedKeys = keys.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target) ||
        !MOVEMENT_KEYS.has(event.code)
      ) {
        return;
      }

      pressedKeys.add(event.code);
      if (event.code.startsWith("Arrow")) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);
    };

    const handleBlur = () => {
      pressedKeys.clear();
        activePointerId.current = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        handleBlur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      pressedKeys.clear();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) {
        return;
      }
      if (activePointerId.current !== null) return;

      activePointerId.current = event.pointerId;
      lastPointer.current = { x: event.clientX, y: event.clientY };

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is not available in every browser.
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current) return;

      const dx = event.clientX - lastPointer.current.x;
      const dy = event.clientY - lastPointer.current.y;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      const lookStep = LOOK_SPEED * lookSensitivity;

      yaw.current -= dx * lookStep;
      pitch.current = clamp(
        pitch.current - dy * lookStep,
        -MAX_PITCH,
        MAX_PITCH,
      );
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    };

    const endPointer = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current) return;

      activePointerId.current = null;
        try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already have been released.
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      event.preventDefault();
      const delta =
        event.deltaY *
        (event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? 100
            : 1);
      wheelAccumulator.current += delta;

      const steps = Math.trunc(
        wheelAccumulator.current / WHEEL_SPEED_THRESHOLD,
      );
      if (steps === 0) {
        return;
      }

      wheelAccumulator.current -= steps * WHEEL_SPEED_THRESHOLD;
      const current = speedRef.current;
      const next = clamp(
        current - steps * SPEED_RANGE.step,
        SPEED_RANGE.min,
        SPEED_RANGE.max,
      );
      speedRef.current = next;
      onSpeedChange?.(next);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("lostpointercapture", endPointer);
    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("lostpointercapture", endPointer);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("wheel", handleWheel);
        activePointerId.current = null;
    };
  }, [active, camera, gl, lookSensitivity, onSpeedChange]);

  useFrame((_, rawDelta) => {
    if (!active) return;

    const delta = Math.min(rawDelta, 0.1);
    const input = moveRef.current;
    const isPressed = (code: string) => keys.current.has(code);

    const forwardInput =
      (isPressed("KeyW") || isPressed("ArrowUp") ? 1 : 0) -
      (isPressed("KeyS") || isPressed("ArrowDown") ? 1 : 0) +
      input.forward;
    const strafeInput =
      (isPressed("KeyD") || isPressed("ArrowRight") ? 1 : 0) -
      (isPressed("KeyA") || isPressed("ArrowLeft") ? 1 : 0) +
      input.strafe;
    const verticalInput =
      (isPressed("KeyE") ? 1 : 0) -
      (isPressed("KeyQ") ? 1 : 0) +
      input.vertical;

    if (
      Math.abs(forwardInput) < 0.001 &&
      Math.abs(strafeInput) < 0.001 &&
      Math.abs(verticalInput) < 0.001
    ) {
      return;
    }

    // Forward follows the full look direction, including pitch. Strafing
    // stays level with the horizon; Q/E and the height buttons add altitude.
    camera.getWorldDirection(forward.current);
    right.current.copy(RIGHT).applyAxisAngle(Y_AXIS, yaw.current);
    direction.current
      .set(0, 0, 0)
      .addScaledVector(forward.current, forwardInput)
      .addScaledVector(right.current, strafeInput)
      .addScaledVector(UP, verticalInput);

    if (direction.current.lengthSq() > 1) {
      direction.current.normalize();
    }

    const sprint =
      isPressed("ShiftLeft") || isPressed("ShiftRight")
        ? SPRINT_MULTIPLIER
        : 1;
    camera.position.addScaledVector(
      direction.current,
      speed * sprint * delta,
    );
  });

  return null;
}

export function FlyJoystick({ moveRef }: { moveRef: MoveInputRef }) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    const radius = rect.width / 2;
    let x = (clientX - (rect.left + radius)) / radius;
    let y = (clientY - (rect.top + radius)) / radius;
    const length = Math.hypot(x, y);

    if (length > 1) {
      x /= length;
      y /= length;
    }

    setKnob({ x: x * radius * 0.48, y: y * radius * 0.48 });
    moveRef.current.strafe = x;
    moveRef.current.forward = -y;
  };

  const stop = useCallback(() => {
    dragging.current = false;
    activePointerId.current = null;
    moveRef.current.strafe = 0;
    moveRef.current.forward = 0;
    setKnob({ x: 0, y: 0 });
  }, [moveRef]);

  useEffect(() => {
    const input = moveRef.current;
    const handleBlur = () => stop();
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      input.strafe = 0;
      input.forward = 0;
    };
  }, [moveRef, stop]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragging.current) return;

    dragging.current = true;
    activePointerId.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in every browser.
    }
    update(event.clientX, event.clientY);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== activePointerId.current) return;
    stop();
  };

  return (
    <div
      ref={padRef}
      role="group"
      aria-label="Fly movement joystick"
      style={{
        position: "absolute",
        left: 12,
        bottom: "max(12px, env(safe-area-inset-bottom))",
        zIndex: 3,
        width: 96,
        height: 96,
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "50%",
        background: "rgba(17, 17, 17, 0.62)",
        boxShadow: "inset 0 0 0 12px rgba(255, 255, 255, 0.03)",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => {
        if (
          dragging.current &&
          event.pointerId === activePointerId.current
        ) {
          update(event.clientX, event.clientY);
        }
      }}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "rgba(220, 230, 245, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          transform: `translate(-50%, -50%) translate(${knob.x}px, ${knob.y}px)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function FlyHeightControls({ moveRef }: { moveRef: MoveInputRef }) {
  const setVertical = (value: number) => {
    moveRef.current.vertical = value;
  };

  const release = () => setVertical(0);

  useEffect(() => {
    const input = moveRef.current;
    const release = () => {
      input.vertical = 0;
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        release();
      }
    };

    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", handleVisibility);
      input.vertical = 0;
    };
  }, [moveRef]);

  const buttonStyle = {
    width: 44,
    height: 44,
    padding: 0,
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "50%",
    background: "rgba(17, 17, 17, 0.72)",
    color: "#ddd",
    fontFamily: "system-ui, sans-serif",
    fontSize: 18,
    cursor: "pointer",
    touchAction: "none" as const,
  };

  return (
    <div
      aria-label="Fly altitude controls"
      role="group"
      style={{
        position: "absolute",
        right: 12,
        bottom: "max(12px, env(safe-area-inset-bottom))",
        zIndex: 3,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <button
        type="button"
        aria-label="Fly up"
        title="Fly up"
        style={buttonStyle}
        onPointerDown={(event) => {
          event.preventDefault();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Pointer capture is not available in every browser.
          }
          setVertical(1);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
        onLostPointerCapture={release}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label="Fly down"
        title="Fly down"
        style={buttonStyle}
        onPointerDown={(event) => {
          event.preventDefault();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Pointer capture is not available in every browser.
          }
          setVertical(-1);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
        onLostPointerCapture={release}
      >
        ↓
      </button>
    </div>
  );
}
