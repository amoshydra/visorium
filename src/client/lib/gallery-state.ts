export const ROOT_FOLDER = "__root__";

export type MediaType = "all" | "image" | "video";
export type GallerySort = "discovery" | "name" | "modified" | "size";
export type GalleryOrder = "asc" | "desc";
export type GalleryDensity = "compact" | "comfortable" | "large";

export interface GalleryState {
  query: string;
  type: MediaType;
  sort: GallerySort;
  order: GalleryOrder;
  folder: string;
  density: GalleryDensity;
}

export const DENSITY_WIDTHS: Record<GalleryDensity, number> = {
  compact: 140,
  comfortable: 190,
  large: 280,
};

export const DEFAULT_GALLERY_STATE: GalleryState = {
  query: "",
  type: "all",
  sort: "discovery",
  order: "asc",
  folder: "",
  density: "comfortable",
};

const MEDIA_TYPES: readonly MediaType[] = ["all", "image", "video"];
const SORTS: readonly GallerySort[] = [
  "discovery",
  "name",
  "modified",
  "size",
];
const ORDERS: readonly GalleryOrder[] = ["asc", "desc"];
const DENSITIES: readonly GalleryDensity[] = [
  "compact",
  "comfortable",
  "large",
];

const parseChoice = <T extends string>(
  value: string | null,
  choices: readonly T[],
  fallback: T,
): T => {
  return choices.includes(value as T) ? (value as T) : fallback;
};

export const normalizeFolder = (value: string): string => {
  if (value === ROOT_FOLDER) {
    return value;
  }

  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
};

export const parseGalleryState = (search: string): GalleryState => {
  const params = new URLSearchParams(search);
  const query = params.get("q") ?? params.get("search") ?? "";

  return {
    query,
    type: parseChoice(params.get("type"), MEDIA_TYPES, "all"),
    sort: parseChoice(params.get("sort"), SORTS, "discovery"),
    order: parseChoice(params.get("order"), ORDERS, "asc"),
    folder: normalizeFolder(params.get("folder") ?? ""),
    density: parseChoice(params.get("density"), DENSITIES, "comfortable"),
  };
};

export const serializeGalleryState = (state: GalleryState): string => {
  const params = new URLSearchParams();

  if (state.query) params.set("q", state.query);
  if (state.type !== "all") params.set("type", state.type);
  if (state.sort !== "discovery") params.set("sort", state.sort);
  if (state.order !== "asc") params.set("order", state.order);
  if (state.folder) params.set("folder", state.folder);
  if (state.density !== "comfortable") params.set("density", state.density);

  return params.toString();
};
