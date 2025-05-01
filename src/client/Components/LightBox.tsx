import { MouseEventHandler, ReactElement, useCallback, useEffect } from "react";
import css from "./Media.module.css";

export const LightBox = ({
  children,
  aspectRatio,
  active,
  onActiveChange,
}: {
  children: ReactElement;
  aspectRatio: string | undefined;
  active: boolean;
  onActiveChange: (active: boolean) => void;
}) => {
  useEffect(() => {
    const fn = () => {
      onActiveChange(false);
    };
    window.addEventListener("popstate", fn);
    return () => {
      window.removeEventListener("popstate", fn);
    };
  }, [onActiveChange]);

  const activateDialog: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (active) return;
      e.preventDefault();

      onActiveChange(true);
      history.pushState(null, "", window.location.href);
    },
    [active, onActiveChange],
  );

  return (
    <button
      style={{ aspectRatio }}
      className={css.lightBoxButton}
      onClick={activateDialog}
      onContextMenuCapture={activateDialog}
    >
      <div data-active={active} className={css.lightBoxBackdrop} />
      <dialog
        autoFocus
        className={css.lightBoxDialog}
        data-active={active}
        open={active}
        // @ts-expect-error closedby is not defined in React yet
        closedby={active ? "any" : "none"}
        onClose={() => {
          history.back();
        }}
      >
        {children}
      </dialog>
    </button>
  );
};
