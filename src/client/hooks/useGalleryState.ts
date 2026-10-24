import { useCallback, useEffect, useState } from "react";
import {
  parseGalleryState,
  serializeGalleryState,
  type GalleryState,
} from "../lib/gallery-state";

export const useGalleryState = () => {
  const [state, setState] = useState<GalleryState>(() =>
    parseGalleryState(window.location.search),
  );

  useEffect(() => {
    const handlePopState = () => {
      setState(parseGalleryState(window.location.search));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const update = useCallback((patch: Partial<GalleryState>) => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }

    setState((previous) => {
      const next = { ...previous, ...patch };
      const search = serializeGalleryState(next);
      const url = `${window.location.pathname}${search ? `?${search}` : ""}${
        window.location.hash
      }`;
      history.replaceState(history.state, "", url);
      return next;
    });
  }, []);

  return [state, update] as const;
};
