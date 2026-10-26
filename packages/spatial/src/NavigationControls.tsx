import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Euler, Vector3 } from "three";

export type NavigationMode = "orbit" | "walk";

export interface MoveInput {
  forward: number;
  strafe: number;
  vertical: number;
}

export type MoveInputRef = { current: MoveInput };

const WALK_SPEED = 1.2;
const SPRINT_MULTIPLIER = 2.5;
const LOOK_SPEED = 0.0035;
const WHEEL_STEP = 0.0025;
const MAX_PITCH = Math.PI * 0.47;
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
}: {
  active: boolean;
  moveRef: MoveInputRef;
  resetToken: number;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const direction = useRef(new Vector3());
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());

  useEffect(() => {
    keys.current.clear();
    dragging.current = false;

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

    const handleBlur = () => pressedKeys.clear();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      pressedKeys.clear();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      dragging.current = true;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is not available in every browser.
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;

      const dx = event.clientX - lastPointer.current.x;
      const dy = event.clientY - lastPointer.current.y;
      lastPointer.current = { x: event.clientX, y: event.clientY };

      yaw.current -= dx * LOOK_SPEED;
      pitch.current = clamp(
        pitch.current - dy * LOOK_SPEED,
        -MAX_PITCH,
        MAX_PITCH,
      );
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    };

    const handlePointerEnd = (event: PointerEvent) => {
      dragging.current = false;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already have been released.
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      forward.current
        .copy(FORWARD)
        .applyAxisAngle(Y_AXIS, yaw.current);
      camera.position.addScaledVector(
        forward.current,
        -event.deltaY * WHEEL_STEP,
      );
      event.preventDefault();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerEnd);
    canvas.addEventListener("pointercancel", handlePointerEnd);
    canvas.addEventListener("lostpointercapture", handlePointerEnd);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerEnd);
      canvas.removeEventListener("pointercancel", handlePointerEnd);
      canvas.removeEventListener("lostpointercapture", handlePointerEnd);
      canvas.removeEventListener("wheel", handleWheel);
      dragging.current = false;
    };
  }, [active, camera, gl]);

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
      (isPressed("KeyE") ? 1 : 0) - (isPressed("KeyQ") ? 1 : 0) +
      input.vertical;

    if (
      Math.abs(forwardInput) < 0.001 &&
      Math.abs(strafeInput) < 0.001 &&
      Math.abs(verticalInput) < 0.001
    ) {
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
      WALK_SPEED * sprint * delta,
    );
  });

  return null;
}

export function WalkJoystick({ moveRef }: { moveRef: MoveInputRef }) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
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

  const stop = () => {
    dragging.current = false;
    moveRef.current.strafe = 0;
    moveRef.current.forward = 0;
    setKnob({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragging.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in every browser.
    }
    update(event.clientX, event.clientY);
  };

  return (
    <div
      ref={padRef}
      role="group"
      aria-label="Walk movement joystick"
      style={{
        position: "absolute",
        right: 12,
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
        if (dragging.current) update(event.clientX, event.clientY);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
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
      style={{
        position: "absolute",
        right: 116,
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
      >
        ↓
      </button>
    </div>
  );
}
