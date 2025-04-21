import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState, XROrigin } from "@react-three/xr";
import { RefObject, useRef } from "react";
import type { Group, Mesh } from "three";

type ButtonId = "l1" | "l2" | "r1" | "r2";

export interface ControllersProps {
  modelRef: RefObject<Mesh | null>;
  onButtonPress: (id: ButtonId) => void;
}

export function Controllers({ modelRef, onButtonPress }: ControllersProps) {
  const leftController = useXRInputSourceState("controller", "left");
  const rightController = useXRInputSourceState("controller", "right");
  const ref = useRef<Group>(null);

  const buttonMap = useRef({
    l1: false,
    l2: false,
    r1: false,
    r2: false,
  });

  const handleButton = (
    button: { state: "pressed" | "default" | "touched" } | undefined,
    id: ButtonId,
    callback: (id: ButtonId) => void,
  ) => {
    switch (button?.state) {
      case "pressed": {
        if (!buttonMap.current[id]) {
          callback(id);
        }
        buttonMap.current[id] = true;
        return;
      }
      case "default":
      default:
        buttonMap.current[id] = false;
        return;
    }
  };

  useFrame((_, delta) => {
    if (modelRef.current == null || ref.current == null) return;

    if (leftController) {
      const thumstickState = leftController.gamepad["xr-standard-thumbstick"];
      const squeezeState = leftController.gamepad["xr-standard-squeeze"];
      const b1 = leftController.gamepad["y-button"];
      const b2 = leftController.gamepad["x-button"];

      handleButton(b1, "l1", onButtonPress);
      handleButton(b2, "l2", onButtonPress);

      if (squeezeState?.state === "pressed") {
        if (thumstickState) {
          const s = (thumstickState.yAxis ?? 0) * delta;
          modelRef.current.scale.x -= s;
          modelRef.current.scale.y -= s;
          modelRef.current.scale.z -= s;
        }
      } else {
        if (thumstickState) {
          modelRef.current.position.y -= (thumstickState.yAxis ?? 0) * delta;
        }
      }
    }

    if (rightController) {
      const thumstickState = rightController.gamepad["xr-standard-thumbstick"];
      const squeezeState = rightController.gamepad["xr-standard-squeeze"];
      const b1 = rightController.gamepad["b-button"];
      const b2 = rightController.gamepad["a-button"];
      handleButton(b1, "r1", onButtonPress);
      handleButton(b2, "r2", onButtonPress);

      if (squeezeState?.state === "pressed") {
        if (thumstickState) {
          modelRef.current.rotation.y += (thumstickState.xAxis ?? 0) * delta;
        }
      } else {
        if (thumstickState != null) {
          modelRef.current.position.x += (thumstickState.xAxis ?? 0) * delta;
          modelRef.current.position.z += (thumstickState.yAxis ?? 0) * delta;
        }
      }
    }
  });
  return <XROrigin ref={ref} />;
}
