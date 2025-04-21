import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { VrGallery } from "./Components/VrGallery.tsx";
import "./index.css";

const store = createXRStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <button onClick={() => store.enterXR("immersive-ar")}>Enter</button>
    <Canvas>
      <XR store={store}>
        <VrGallery />
      </XR>
    </Canvas>
  </StrictMode>,
);
