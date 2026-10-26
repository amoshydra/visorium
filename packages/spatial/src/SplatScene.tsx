import { useThree } from "@react-three/fiber";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { useEffect, useMemo, useState } from "react";
import { Vector3 } from "three";

/**
 * Kept in a separate module so Three/R3F lightboxes for GLB models do not pay
 * the Spark renderer cost unless a splat is actually opened.
 */
export default function SplatScene({ src }: { src: string }) {
  const { gl } = useThree();
  const spark = useMemo(() => new SparkRenderer({ renderer: gl }), [gl]);
  const splat = useMemo(
    () => new SplatMesh({ url: src, withCredentials: true }),
    [src],
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void splat.initialized
      .then(() => {
        if (!active) return;
        const box = splat.getBoundingBox(true);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());
        const max = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2 / max;
        splat.scale.setScalar(scale);
        splat.position.set(
          -center.x * scale,
          -center.y * scale + 1.1,
          -center.z * scale,
        );
        setReady(true);
      })
      .catch(() => {});

    return () => {
      active = false;
      splat.dispose();
      spark.dispose();
    };
  }, [splat, spark]);

  return (
    <>
      <primitive object={spark} />
      {ready ? <primitive object={splat} /> : null}
    </>
  );
}
