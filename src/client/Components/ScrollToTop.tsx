import { useEffect, useState } from "react";
import css from "./ScrollToTop.module.css";

export const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > window.innerHeight * 1.5);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      className={css.button}
      aria-label="Back to top"
      title="Back to top"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      ↑
    </button>
  );
};
