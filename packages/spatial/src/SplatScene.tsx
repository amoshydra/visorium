import { useThree } from "@react-three/fiber";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { useEffect, useRef, useState } from "react";
import { Vector3 } from "three";

export interface SplatSceneProps {
  src: string;
  onStatus?: (status: string | null) => void;
  onError?: (message: string) => void;
}

/**
 * Kept in a separate module so Three/R3F lightboxes for GLB models do not pay
 * the Spark renderer cost unless a splat is actually opened.
 *
 * Creating a SplatMesh for a large PLY can block the main thread, so the mesh
 * is created after an animation frame. That lets the lightbox paint its loading
 * state before parsing starts.
 */
export default function SplatScene({
  src,
  onStatus,
  onError,
}: SplatSceneProps) {
  const { gl } = useThree();
  const resources = useRef<{
    spark: SparkRenderer;
    splat: SplatMesh;
  } | null>(null);
  const [spark, setSpark] = useState<SparkRenderer | null>(null);
  const [splat, setSplat] = useState<SplatMesh | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    onStatus?.("Preparing splat…");

    const frame = requestAnimationFrame(() => {
      if (!active) return;

      try {
        const nextSpark = new SparkRenderer({ renderer: gl });
        const nextSplat = new SplatMesh({
          url: src,
          withCredentials: true,
          onProgress: (event) => {
            if (event.lengthComputable && event.total > 0) {
              const percent = Math.min(
                99,
                Math.round((event.loaded / event.total) * 100),
              );
              onStatus?.(`Loading splat… ${percent}%`);
            } else {
              onStatus?.("Loading splat…");
            }
          },
        });

        resources.current = { spark: nextSpark, splat: nextSplat };
        setSpark(nextSpark);
        setSplat(nextSplat);
      } catch (error) {
        onStatus?.(null);
        onError?.(
          `Could not initialize splat rendering: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      resources.current?.splat.dispose();
      resources.current?.spark.dispose();
      resources.current = null;
    };
  }, [gl, onError, onStatus, src]);

  useEffect(() => {
    if (!splat) return;

    let active = true;
    void splat.initialized
      .then(() => {
        if (!active) return;
        const box = splat.getBoundingBox(true);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());
        const max = Math.max(size.x, size.y, size.z);

        if (!Number.isFinite(max) || max <= 0) {
          onStatus?.(null);
          onError?.("Could not determine the splat bounds.");
          return;
        }

        const scale = 2 / max;
        splat.frustumCulled = false;
        splat.scale.setScalar(scale);
        splat.position.set(
          -center.x * scale,
          -center.y * scale + 1.1,
          -center.z * scale,
        );
        setReady(true);
        onStatus?.(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        onStatus?.(null);
        onError?.(
          `Could not load splat: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });

    return () => {
      active = false;
    };
  }, [onError, onStatus, splat]);

  if (!spark || !splat) {
    return null;
  }

  return (
    <>
      <primitive object={spark} />
      {ready ? <primitive object={splat} /> : null}
    </>
  );
}
