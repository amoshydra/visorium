import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { ToneMapping } from "./Components/Vr/ToneMapping.tsx";
import { VrGallery } from "./Components/VrGallery.tsx";
import "./index.css";

const store = createXRStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          Something went wrong
          <button onClick={resetErrorBoundary}>Reload</button>
          <div>{error.name}</div>
          <div>{error.message}</div>
        </div>
      )}
    >
      <button
        style={{ padding: "0.5rem 1rem", margin: "1rem" }}
        onClick={() => store.enterXR("immersive-vr")}
      >
        Enter XR
      </button>
      <Canvas>
        <ToneMapping />
        <color attach="background" args={[0x2e2e2e]} />
        <XR store={store}>
          <VrGallery />
        </XR>
      </Canvas>
    </ErrorBoundary>
  </StrictMode>,
);
