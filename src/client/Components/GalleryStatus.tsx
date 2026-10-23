import css from "./GalleryStatus.module.css";

export type GalleryStatusVariant = "loading" | "empty" | "error";

export interface GalleryStatusProps {
  variant: GalleryStatusVariant;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const GalleryStatus = ({
  variant,
  title,
  message,
  actionLabel,
  onAction,
}: GalleryStatusProps) => {
  return (
    <div
      className={css.status}
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span className={css.dot} data-variant={variant} aria-hidden="true" />
      <h1 className={css.title}>{title}</h1>
      {message && <p className={css.message}>{message}</p>}
      {actionLabel && onAction && (
        <button type="button" className={css.action} onClick={onAction}>
          {actionLabel}
        </button>
      )}
      {variant === "loading" && (
        <div className={css.skeletonGrid} aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className={css.skeleton} />
          ))}
        </div>
      )}
    </div>
  );
};
