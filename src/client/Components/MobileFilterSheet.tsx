import { Fragment, useEffect, useRef } from "react";
import { formatCount } from "../lib/format";
import {
  ROOT_FOLDER,
  type GalleryDensity,
  type GalleryOrder,
  type GallerySort,
  type GalleryState,
  type MediaType,
} from "../lib/gallery-state";
import {
  getChildFolders,
  type FolderOption,
} from "../lib/select-media";
import css from "./MobileFilterSheet.module.css";

export interface MobileFilterSheetProps {
  state: GalleryState;
  folders: FolderOption[];
  onChange: (patch: Partial<GalleryState>) => void;
  onClose: () => void;
}

const TYPE_OPTIONS: Array<{ value: MediaType; label: string }> = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

const SORT_OPTIONS: Array<{ value: GallerySort; label: string }> = [
  { value: "discovery", label: "Discovery" },
  { value: "name", label: "Name" },
  { value: "modified", label: "Modified" },
  { value: "size", label: "Size" },
];

const DENSITY_OPTIONS: Array<{ value: GalleryDensity; label: string }> = [
  { value: "compact", label: "3 columns" },
  { value: "comfortable", label: "2 columns" },
  { value: "large", label: "1 column" },
];

export const MobileFilterSheet = ({
  state,
  folders,
  onChange,
  onClose,
}: MobileFilterSheetProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const children = getChildFolders(folders, state.folder);
  const breadcrumbParts =
    state.folder && state.folder !== ROOT_FOLDER
      ? state.folder.split("/")
      : [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    dialog.showModal();

    const desktop = window.matchMedia("(min-width: 721px)");
    const handleDesktop = () => {
      if (desktop.matches) {
        onClose();
      }
    };
    desktop.addEventListener("change", handleDesktop);

    return () => {
      desktop.removeEventListener("change", handleDesktop);
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={css.dialog}
      aria-label="Filters"
      data-active="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={css.sheet} onClick={(event) => event.stopPropagation()}>
        <div className={css.handle} aria-hidden="true" />
        <header className={css.header}>
          <h2 className={css.title}>Filters</h2>
        </header>

        <div className={css.body}>
          <section className={css.section}>
            <span className={css.sectionLabel}>Type</span>
            <div className={css.segmented} role="group" aria-label="Media type">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={css.segment}
                  data-active={state.type === option.value}
                  aria-pressed={state.type === option.value}
                  onClick={() => onChange({ type: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className={css.section}>
            <span className={css.sectionLabel}>Sort</span>
            <div className={css.field}>
              <select
                className={css.select}
                value={state.sort}
                aria-label="Sort files"
                onChange={(event) =>
                  onChange({ sort: event.target.value as GallerySort })
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={css.orderButton}
                aria-label={
                  state.order === "asc" ? "Sort descending" : "Sort ascending"
                }
                onClick={() =>
                  onChange({
                    order: (state.order === "asc"
                      ? "desc"
                      : "asc") as GalleryOrder,
                  })
                }
              >
                {state.order === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
            </div>
          </section>

          <section className={css.section}>
            <span className={css.sectionLabel}>Folder</span>

            <div className={css.breadcrumb}>
              <button
                type="button"
                className={css.crumb}
                data-active={!state.folder}
                onClick={() => onChange({ folder: "" })}
              >
                All folders
              </button>
              {state.folder === ROOT_FOLDER && (
                <>
                  <span className={css.separator} aria-hidden="true">
                    ›
                  </span>
                  <span className={css.currentCrumb}>Root files</span>
                </>
              )}
              {breadcrumbParts.map((part, index) => {
                const value = breadcrumbParts.slice(0, index + 1).join("/");
                const isCurrent = value === state.folder;

                return (
                  <Fragment key={value}>
                    <span className={css.separator} aria-hidden="true">
                      ›
                    </span>
                    <button
                      type="button"
                      className={css.crumb}
                      data-active={isCurrent}
                      aria-current={isCurrent ? "true" : undefined}
                      onClick={() => onChange({ folder: value })}
                    >
                      {part}
                    </button>
                  </Fragment>
                );
              })}
            </div>

            {children.length > 0 ? (
              <div className={css.folderList}>
                {children.map((child) => (
                  <button
                    key={child.value}
                    type="button"
                    className={css.folderRow}
                    onClick={() => onChange({ folder: child.value })}
                  >
                    <span className={css.folderName}>{child.label}</span>
                    <span className={css.folderCount}>
                      {formatCount(child.count)}
                    </span>
                    <span className={css.chevron} aria-hidden="true">
                      ›
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className={css.empty}>No subfolders</p>
            )}
          </section>

          <section className={css.section}>
            <span className={css.sectionLabel}>Density</span>
            <div className={css.segmented} role="group" aria-label="Density">
              {DENSITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={css.segment}
                  data-active={state.density === option.value}
                  aria-pressed={state.density === option.value}
                  onClick={() => onChange({ density: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className={css.footer}>
          <button
            type="button"
            className={css.clearButton}
            onClick={() => onChange({ query: "", type: "all", folder: "" })}
          >
            Clear filters
          </button>
          <button type="button" className={css.doneButton} onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </dialog>
  );
};
