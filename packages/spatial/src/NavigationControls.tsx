import { useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Euler, Plane, Raycaster, Vector2, Vector3 } from "three";
import { SPEED_RANGE, isEditableTarget } from "./settings.js";

export type NavigationMode = "orbit" | "walk";

export interface MoveInput {
  forward: number;
  strafe: number;
  vertical: number;
}

export type MoveInputRef = { current: MoveInput };

const SPRINT_MULTIPLIER = 2.5;
const LOOK_SPEED = 0.0035;
const MAX_PITCH = Math.PI * 0.47;
const TAP_MOVE_THRESHOLD = 8;
const TAP_MAX_DISTANCE = 30;
const WALK_TARGET_STOP = 0.06;
const WHEEL_SPEED_THRESHOLD = 100;
const FLOOR_PLANE = new Plane(new Vector3(0, 1, 0), 0);
const Y_AXIS = new Vector3(0, 1, 0);
const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, -1);
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

export function WalkControls({
  active,
  moveRef,
  resetToken,
  speed,
  lookSensitivity,
  stayGrounded,
  tapToWalk,
  onSpeedChange,
  onWalkTarget,
}: {
  active: boolean;
  moveRef: MoveInputRef;
  resetToken: number;
  speed: number;
  lookSensitivity: number;
  stayGrounded: boolean;
  tapToWalk: boolean;
  onSpeedChange?: (speed: number) => void;
  onWalkTarget?: (target: Vector3 | null) => void;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const tapStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
    time: number;
    moved: boolean;
  } | null>(null);
  const keys = useRef(new Set<string>());
  const direction = useRef(new Vector3());
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const speedRef = useRef(speed);
  const wheelAccumulator = useRef(0);
  const lockedHeight = useRef<number | null>(null);
  const walkTarget = useRef<Vector3 | null>(null);

  const clearWalkTarget = useCallback(() => {
    if (!walkTarget.current) return;
    walkTarget.current = null;
    onWalkTarget?.(null);
  }, [onWalkTarget]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    keys.current.clear();
    dragging.current = false;
    activePointerId.current = null;
    tapStart.current = null;
    clearWalkTarget();
    lockedHeight.current = null;
    wheelAccumulator.current = 0;

    if (!active) return;

    const euler = new Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yaw.current = euler.y;
    pitch.current = euler.x;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    if (stayGrounded) {
      lockedHeight.current = camera.position.y;
      moveRef.current.vertical = 0;
    }
  }, [
    active,
    camera,
    clearWalkTarget,
    moveRef,
    resetToken,
    stayGrounded,
  ]);

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
      if (
        event.code !== "ShiftLeft" &&
        event.code !== "ShiftRight"
      ) {
        clearWalkTarget();
      }
      if (event.code.startsWith("Arrow")) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);
    };

    const handleBlur = () => {
      pressedKeys.clear();
      dragging.current = false;
      activePointerId.current = null;
      tapStart.current = null;
      clearWalkTarget();
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
  }, [active, clearWalkTarget]);

  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;
    const raycaster = new Raycaster();
    const pointer = new Vector2();

    const setTargetFromTap = (clientX: number, clientY: number) => {
      if (!tapToWalk) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);

      const target = new Vector3();
      if (!raycaster.ray.intersectPlane(FLOOR_PLANE, target)) {
        return;
      }
      if (target.distanceTo(camera.position) > TAP_MAX_DISTANCE) {
        return;
      }

      const dx = target.x - camera.position.x;
      const dz = target.z - camera.position.z;
      if (Math.hypot(dx, dz) > 0.01) {
        yaw.current = Math.atan2(-dx, -dz);
        camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
      }

      walkTarget.current = target.clone();
      onWalkTarget?.(target.clone());
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) {
        return;
      }
      if (activePointerId.current !== null) return;

      activePointerId.current = event.pointerId;
      dragging.current = true;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      tapStart.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        moved: event.pointerType === "mouse" && event.button === 2,
      };

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is not available in every browser.
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current) return;

      const tap = tapStart.current;
      if (
        tap?.pointerId === event.pointerId &&
        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) >
          TAP_MOVE_THRESHOLD
      ) {
        tap.moved = true;
      }

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
      dragging.current = false;
      tapStart.current = null;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already have been released.
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current) return;

      const tap = tapStart.current;
      const isLeftClick =
        event.pointerType !== "mouse" || event.button === 0;
      if (
        tap &&
        tap.pointerId === event.pointerId &&
        !tap.moved &&
        isLeftClick &&
        performance.now() - tap.time < 500
      ) {
        setTargetFromTap(event.clientX, event.clientY);
      }

      endPointer(event);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      endPointer(event);
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
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("lostpointercapture", handlePointerCancel);
    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      canvas.removeEventListener("lostpointercapture", handlePointerCancel);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("wheel", handleWheel);
      dragging.current = false;
      activePointerId.current = null;
      tapStart.current = null;
    };
  }, [
    active,
    camera,
    clearWalkTarget,
    gl,
    lookSensitivity,
    onSpeedChange,
    onWalkTarget,
    tapToWalk,
  ]);

  useEffect(() => {
    if (!active || !tapToWalk) {
      clearWalkTarget();
    }
  }, [active, clearWalkTarget, tapToWalk]);

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
    const verticalInput = stayGrounded
      ? 0
      : (isPressed("KeyE") ? 1 : 0) -
        (isPressed("KeyQ") ? 1 : 0) +
        input.vertical;
    const hasManualInput =
      Math.abs(forwardInput) > 0.001 ||
      Math.abs(strafeInput) > 0.001 ||
      Math.abs(verticalInput) > 0.001;

    if (hasManualInput) {
      clearWalkTarget();
    } else if (walkTarget.current) {
      const target = walkTarget.current;
      const dx = target.x - camera.position.x;
      const dz = target.z - camera.position.z;
      const distance = Math.hypot(dx, dz);

      if (distance <= WALK_TARGET_STOP) {
        clearWalkTarget();
      } else {
        const step = Math.min(distance, speed * delta);
        camera.position.x += (dx / distance) * step;
        camera.position.z += (dz / distance) * step;
      }
    } else {
      if (stayGrounded && lockedHeight.current !== null) {
        camera.position.y = lockedHeight.current;
      }
      return;
    }

    forward.current.copy(FORWARD).applyAxisAngle(Y_AXIS, yaw.current);
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

    if (stayGrounded && lockedHeight.current !== null) {
      camera.position.y = lockedHeight.current;
    }
  });

  return null;
}

export function WalkJoystick({ moveRef }: { moveRef: MoveInputRef }) {
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
      aria-label="Walk movement joystick"
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

export function WalkHeightControls({ moveRef }: { moveRef: MoveInputRef }) {
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
      aria-label="Walk height controls"
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
        aria-label="Move up"
        title="Move up"
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
        aria-label="Move down"
        title="Move down"
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
