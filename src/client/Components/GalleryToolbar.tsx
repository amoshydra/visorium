import { formatCount } from "../lib/format";
import {
  ROOT_FOLDER,
  type GalleryDensity,
  type GalleryOrder,
  type GallerySort,
  type GalleryState,
  type MediaType,
} from "../lib/gallery-state";
import { hasActiveFilters, type FolderOption } from "../lib/select-media";
import css from "./GalleryToolbar.module.css";

export interface GalleryToolbarProps {
  state: GalleryState;
  totalCount: number;
  filteredCount: number;
  folders: FolderOption[];
  onChange: (patch: Partial<GalleryState>) => void;
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
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "large", label: "Large" },
];

export const GalleryToolbar = ({
  state,
  totalCount,
  filteredCount,
  folders,
  onChange,
}: GalleryToolbarProps) => {
  const hasFolders = folders.some((folder) => folder.value !== ROOT_FOLDER);
  const filtersActive = hasActiveFilters(state);
  const count =
    filteredCount === totalCount
      ? `${formatCount(totalCount)} ${totalCount === 1 ? "item" : "items"}`
      : `${formatCount(filteredCount)} of ${formatCount(totalCount)}`;

  return (
    <div className={css.toolbar} role="toolbar" aria-label="Gallery controls">
      <input
        className={css.search}
        type="search"
        value={state.query}
        placeholder="Search files"
        aria-label="Search files"
        onChange={(event) => onChange({ query: event.target.value })}
      />

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

      <label className={css.control}>
        <span>Sort</span>
        <select
          value={state.sort}
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
      </label>

      <button
        type="button"
        className={css.orderButton}
        aria-label={
          state.order === "asc" ? "Sort descending" : "Sort ascending"
        }
        title={state.order === "asc" ? "Ascending" : "Descending"}
        onClick={() =>
          onChange({ order: (state.order === "asc" ? "desc" : "asc") as GalleryOrder })
        }
      >
        {state.order === "asc" ? "↑" : "↓"}
      </button>

      {hasFolders && (
        <label className={`${css.control} ${css.folderControl}`}>
          <span>Folder</span>
          <select
            value={state.folder}
            title={state.folder || "All folders"}
            onChange={(event) => onChange({ folder: event.target.value })}
          >
            <option value="">All folders</option>
            {folders.map((folder) => (
              <option key={folder.value} value={folder.value}>
                {folder.label} ({folder.count})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className={css.control}>
        <span>Density</span>
        <select
          value={state.density}
          onChange={(event) =>
            onChange({ density: event.target.value as GalleryDensity })
          }
        >
          {DENSITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {filtersActive && (
        <button
          type="button"
          className={css.clear}
          onClick={() => onChange({ query: "", type: "all", folder: "" })}
        >
          Clear
        </button>
      )}

      <span className={css.count}>{count}</span>
    </div>
  );
};
