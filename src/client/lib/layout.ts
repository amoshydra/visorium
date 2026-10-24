import { DENSITY_WIDTHS, type GalleryDensity } from "./gallery-state";

export const MOBILE_COLUMNS: Record<GalleryDensity, number> = {
  compact: 3,
  comfortable: 2,
  large: 1,
};

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
    const columns = MOBILE_COLUMNS[density];
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
