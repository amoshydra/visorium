import { DENSITY_WIDTHS, type GalleryDensity } from "./gallery-state";

const MOBILE_MIN_TILE: Record<GalleryDensity, number> = {
  compact: 100,
  comfortable: 150,
  large: 260,
};

const MOBILE_MAX_COLUMNS = 6;

export interface GridMetrics {
  columns: number;
  columnWidth: number;
}

export const getGridMetrics = (
  viewportWidth: number,
  density: GalleryDensity,
  isMobile: boolean,
): GridMetrics => {
  const width = Math.max(1, viewportWidth);

  if (isMobile) {
    const rawColumns = Math.max(
      1,
      Math.min(MOBILE_MAX_COLUMNS, Math.floor(width / MOBILE_MIN_TILE[density])),
    );
    const columns = Math.max(density === "large" ? 1 : 2, rawColumns);

    return {
      columns,
      columnWidth: Math.max(1, Math.floor(width / columns)),
    };
  }

  const minColumnWidth = DENSITY_WIDTHS[density];
  const columns = Math.max(1, Math.floor(width / minColumnWidth));

  return {
    columns,
    columnWidth: Math.max(1, Math.floor(width / columns)),
  };
};
