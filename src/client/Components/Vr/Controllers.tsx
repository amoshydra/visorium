import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import { useRef } from "react";

type ButtonId = "l1" | "l2" | "r1" | "r2";
type Vector3Liked = [x: number, y: number, z: number];

export interface ControllersProps {
  onButtonPress: (id: ButtonId) => void;
  onPositionChange: (setter: (position: Vector3Liked) => Vector3Liked) => void;
  onScaleChange: (setter: (scale: Vector3Liked) => Vector3Liked) => void;
  onRotationChange: (setter: (rotation: Vector3Liked) => Vector3Liked) => void;
}

export function Controllers({
  onButtonPress,
  onScaleChange,
  onPositionChange,
  onRotationChange,
}: ControllersProps) {
  const leftController = useXRInputSourceState("controller", "left");
  const rightController = useXRInputSourceState("controller", "right");

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
          onScaleChange((previousScale) => {
            return [
              previousScale[0] - s,
              previousScale[1] - s,
              previousScale[2] - s,
            ];
          });
        }
      } else {
        if (thumstickState) {
          onPositionChange((previousPosition) => {
            return [
              previousPosition[0],
              previousPosition[1] + (thumstickState.yAxis ?? 0) * delta,
              previousPosition[2],
            ];
          });
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
          onRotationChange((previousRotation) => {
            return [
              previousRotation[0],
              previousRotation[1] + (thumstickState.xAxis ?? 0) * delta,
              previousRotation[2],
            ];
          });
        }
      } else {
        if (thumstickState != null) {
          onPositionChange((previousPosition) => {
            return [
              previousPosition[0] + (thumstickState.xAxis ?? 0) * delta,
              previousPosition[1],
              previousPosition[2] + (thumstickState.yAxis ?? 0) * delta,
            ];
          });
        }
      }
    }
  });
  return null;
}
