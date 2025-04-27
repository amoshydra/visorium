import { useFrame } from "@react-three/fiber";

export const useWebXrLayerCompat = () => {
  useFrame(({ gl }) => {
    if (!gl.xr.isPresenting) {
      return;
    }

    // Reset mask on v172 before internal updateCamera() sets
    // mask union of all 3 objects.
    const arrayCamera = gl.xr.getCamera();
    if (arrayCamera) {
      arrayCamera.layers.mask = 1;
    }
  });
};
